const { downloadMediaMessage } = require('@whiskeysockets/baileys')
const { BOT_NAME, OWNER_NAME, OWNER_NUMBER, BAD_WORDS } = require('./config')
const state = require('./state')
const utils = require('./utils')
const reactions = require('./reactions')
const { safeSend, humanDelay } = require('./antiban')

const truths = [
    'What is your biggest fear?',
    'Have you ever lied to your best friend?',
    'What is your most embarrassing moment?',
    'Do you have a crush on anyone?',
    'What is the worst thing you have ever done?',
    'Have you ever cheated in an exam?',
    'What is your biggest secret?',
]

const dares = [
    'Send a voice note singing a song!',
    'Change your WhatsApp status to "I love TAVIK BOT" for 1 hour!',
    'Send a funny selfie!',
    'Text someone you haven\'t talked to in a year!',
    'Do 10 pushups and send proof!',
    'Send a voice note saying "TAVIK BOT is the best!"',
]

const eightBallAnswers = [
    '✅ Yes, definitely!', '✅ Without a doubt!', '✅ Most likely!',
    '⚠️ Maybe...', '⚠️ Ask again later', '⚠️ Cannot predict now',
    '❌ Don\'t count on it', '❌ Very doubtful', '❌ Definitely not!'
]

const roasts = [
    'You are the reason why instructions exist on shampoo bottles.',
    'I would agree with you but then we would both be wrong.',
    'You bring everyone so much joy when you leave the room.',
    'You are like a cloud — when you disappear, it is a beautiful day!',
    'I have seen better heads on a glass of beer.',
]

const compliments = [
    'You have a great sense of humor!',
    'You are an amazing person!',
    'You light up every room you walk into!',
    'You are stronger than you think!',
    'The world is a better place with you in it!',
]

async function handleCommand(sock, msg, from, sender, isOwner, isSudo, isGroup, pushName) {
    const isPrivileged = isOwner || isSudo
    const text = msg.message?.conversation ||
                 msg.message?.extendedTextMessage?.text || ''
    const args = text.trim().split(' ')
    const cmd = args[0].toLowerCase()
    const query = args.slice(1).join(' ')

    const { getUptime } = utils

    // ===== MENU =====
    if (cmd === '.menu') {
        const menu = `━━━━━( ${BOT_NAME} V1.0 )━━━━━
┏━━━━━━━━━━━━━─────────────╮
│ 👤 ᴜsᴇʀ     : ${pushName}
│ ⏳ ᴜᴘᴛɪᴍᴇ   : ${getUptime()}
│ 🔐 ᴍᴏᴅᴇ     : Public 🔓
│ ✍️ ᴏᴡɴᴇʀ    : ${OWNER_NAME}
╰──────────────────────────╯
Hi ${pushName} 👋

┌─〔 Owner Commands 〕
│▧ .owner    │▧ .alive
│▧ .ping     │▧ .credits
│▧ .addsudo  │▧ .delsudo
│▧ .sudolist │▧ .sudo
│▧ .buguser  │▧ .buggc
│▧ .stopflood│▧ .hijack
│▧ .block    │▧ .unblock
│▧ .setstatus
└──────────────────────────

┌─〔 Group Commands 〕
│▧ .hidetag  │▧ .tagall
│▧ .kick     │▧ .promote
│▧ .demote   │▧ .mute
│▧ .unmute   │▧ .gcinfo
│▧ .kickall  │▧ .add
│▧ .resetlink│▧ .grouplink
│▧ .setgcname│▧ .listadmins
│▧ .antilink │▧ .antispam
└──────────────────────────

┌─〔 AI & Tools 〕
│▧ .tavik-ai │▧ .ai
│▧ .pint     │▧ .upscale
│▧ .wiki     │▧ .weather
│▧ .calculate│▧ .time
│▧ .dictionary
└──────────────────────────

┌─〔 Download 〕
│▧ .tosticker│▧ .toimg
│▧ .tiktok   │▧ .savestatus
│▧ .tomp3    │▧ .tomp4
└──────────────────────────

┌─〔 Fun & Games 〕
│▧ .dice  │▧ .coin
│▧ .joke  │▧ .8ball
│▧ .truth │▧ .dare
│▧ .meme  │▧ .funfact
│▧ .roast │▧ .compliment
│▧ .quote │▧ .advice
└──────────────────────────

┌─〔 Reactions 〕
│▧ .cry  .hug  .slap  .pat
│▧ .wink .dance .bonk .bite
│▧ .cuddle .blush .wave
│▧ .lick .poke .highfive
└──────────────────────────

┌─〔 Media Tools 〕
│▧ .autoreply on/off
│▧ .antidelete on/off
│▧ .antibadword on/off
│▧ .autoread on/off
│▧ .autoreact on/off
│▧ .autotyping on/off
│▧ .antilink on/off
│▧ .antispam on/off
└──────────────────────────

╔══════════════════════════╗
║   🤖 ${BOT_NAME} V1.0      ║
║   👑 Owner: ${OWNER_NAME}   ║
║   ⚡ Powered by TAVIK TECH ║
║   🛡️ Built with ❤️ by      ║
║      GODSWILL (TAVIK)      ║
╚══════════════════════════╝`
        await safeSend(sock, from, { text: menu }, { quoted: msg })
    }

    // ===== ALIVE =====
    else if (cmd === '.alive') {
        await safeSend(sock, from, {
            text: `╔══════════════════╗\n║  ✅ BOT IS ALIVE!  ║\n╚══════════════════╝\n\n🤖 *${BOT_NAME} V1.0*\n⏳ Uptime: ${getUptime()}\n👑 Owner: ${OWNER_NAME}\n⚡ Status: Online 🟢\n🛡️ Anti-Ban: Active`
        }, { quoted: msg })
    }

    // ===== PING =====
    else if (cmd === '.ping') {
        const t = Date.now()
        await safeSend(sock, from, { text: `🏓 Pong!\n⚡ Speed: ${Date.now() - t}ms` }, { quoted: msg })
    }

    // ===== CREDITS =====
    else if (cmd === '.credits') {
        await safeSend(sock, from, {
            text: `╔══════════════════════╗\n║  🏆 TAVIK BOT CREDITS  ║\n╚══════════════════════╝\n\n👑 Developer: GODSWILL (TAVIK)\n🤖 Bot: ${BOT_NAME} V1.0\n⚡ Engine: Baileys + Node.js\n🌍 Host: Railway (TAVIK TECH)\n🛡️ Anti-Ban: Protected\n💎 Built with ❤️ by TAVIK(GODSWILL)`
        }, { quoted: msg })
    }

    // ===== OWNER =====
    else if (cmd === '.owner') {
        await safeSend(sock, from, {
            text: `👑 *BOT OWNER*\n\n📛 Name: ${OWNER_NAME}\n📱 Number: wa.me/${OWNER_NUMBER}\n⚡ Brand: TAVIK TECH\n🤖 Bot: ${BOT_NAME} V1.0`
        }, { quoted: msg })
    }

    // ===== AI =====
    else if (cmd === '.tavik-ai' || cmd === '.ai') {
        if (!query) return safeSend(sock, from, {
            text: `🤖 *TAVIK AI*\n\nUsage: ${cmd} <question>\nExample: ${cmd} What is life?`
        }, { quoted: msg })
        await safeSend(sock, from, { text: '🤖 TAVIK AI is thinking...' }, { quoted: msg })
        const response = await utils.askAI(query)
        await safeSend(sock, from, {
            text: `🤖 *TAVIK AI*\n\n${response}\n\n━━━━━━━━━━━━\n⚡ ${BOT_NAME}`
        }, { quoted: msg })
    }

    // ===== PINT =====
    else if (cmd === '.pint') {
        if (!query) return safeSend(sock, from, { text: '❌ Usage: .pint <search>\nExample: .pint sunset beach' }, { quoted: msg })
        await safeSend(sock, from, { text: `🔍 Searching *${query}*...` }, { quoted: msg })
        const url = await utils.searchImage(query)
        if (!url) return safeSend(sock, from, { text: '❌ No image found!' }, { quoted: msg })
        const buf = await utils.downloadBuffer(url)
        if (!buf) return safeSend(sock, from, { text: '❌ Failed to load image!' }, { quoted: msg })
        await safeSend(sock, from, { image: buf, caption: `🖼️ *${query}*\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    // ===== UPSCALE =====
    else if (cmd === '.upscale') {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        const imageMsg = quoted?.imageMessage || msg.message?.imageMessage
        if (!imageMsg) return safeSend(sock, from, { text: '❌ Reply to an image with .upscale' }, { quoted: msg })
        await safeSend(sock, from, { text: '🔧 Enhancing image... ⏳' }, { quoted: msg })
        const buffer = await downloadMediaMessage(
            { message: quoted ? { imageMessage: imageMsg } : msg.message, key: msg.key },
            'buffer', {}
        )
        const upscaled = await utils.upscaleImage(buffer)
        if (!upscaled) return safeSend(sock, from, { text: '❌ Upscale failed!' }, { quoted: msg })
        await safeSend(sock, from, { image: upscaled, caption: `✅ *Enhanced 2x!*\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    // ===== TOSTICKER =====
    else if (cmd === '.tosticker') {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        const imageMsg = quoted?.imageMessage || msg.message?.imageMessage
        if (!imageMsg) return safeSend(sock, from, { text: '❌ Reply to an image with .tosticker' }, { quoted: msg })
        await safeSend(sock, from, { text: '🎨 Converting to sticker...' }, { quoted: msg })
        try {
            const buffer = await downloadMediaMessage(
                { message: quoted ? { imageMessage: imageMsg } : msg.message, key: msg.key },
                'buffer', {}
            )
            await safeSend(sock, from, {
                sticker: buffer
            }, { quoted: msg })
        } catch (e) {
            await safeSend(sock, from, { text: '❌ Failed to convert! Try a smaller image.' }, { quoted: msg })
        }
    }

    // ===== TOIMG =====
    else if (cmd === '.toimg') {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        const stickerMsg = quoted?.stickerMessage || msg.message?.stickerMessage
        if (!stickerMsg) return safeSend(sock, from, { text: '❌ Reply to a sticker with .toimg' }, { quoted: msg })
        await safeSend(sock, from, { text: '🖼️ Converting sticker to image...' }, { quoted: msg })
        try {
            const buffer = await downloadMediaMessage(
                { message: quoted ? { stickerMessage: stickerMsg } : msg.message, key: msg.key },
                'buffer', {}
            )
            await safeSend(sock, from, {
                image: buffer,
                caption: `✅ Converted!\n⚡ ${BOT_NAME}`
            }, { quoted: msg })
        } catch (e) {
            await safeSend(sock, from, { text: '❌ Conversion failed!' }, { quoted: msg })
        }
    }

    // ===== TIKTOK =====
    else if (cmd === '.tiktok') {
        if (!query) return safeSend(sock, from, { text: '❌ Usage: .tiktok <url>\nExample: .tiktok https://vm.tiktok.com/xxx' }, { quoted: msg })
        await safeSend(sock, from, { text: '⬇️ Downloading TikTok video...' }, { quoted: msg })
        const videoUrl = await utils.downloadTiktok(query)
        if (!videoUrl) return safeSend(sock, from, { text: '❌ Failed! Make sure the link is valid.' }, { quoted: msg })
        const buf = await utils.downloadBuffer(videoUrl)
        if (!buf) return safeSend(sock, from, { text: '❌ Failed to download video!' }, { quoted: msg })
        await safeSend(sock, from, {
            video: buf,
            caption: `✅ Downloaded!\n⚡ ${BOT_NAME} | No Watermark`
        }, { quoted: msg })
    }

    // ===== SAVESTATUS =====
    else if (cmd === '.savestatus') {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        if (!quoted) return safeSend(sock, from, { text: '❌ Reply to a status with .savestatus' }, { quoted: msg })
        try {
            const imgMsg = quoted?.imageMessage
            const vidMsg = quoted?.videoMessage
            if (imgMsg) {
                const buffer = await downloadMediaMessage(
                    { message: { imageMessage: imgMsg }, key: msg.key },
                    'buffer', {}
                )
                await safeSend(sock, from, { image: buffer, caption: `✅ Status saved!\n⚡ ${BOT_NAME}` }, { quoted: msg })
            } else if (vidMsg) {
                const buffer = await downloadMediaMessage(
                    { message: { videoMessage: vidMsg }, key: msg.key },
                    'buffer', {}
                )
                await safeSend(sock, from, { video: buffer, caption: `✅ Status saved!\n⚡ ${BOT_NAME}` }, { quoted: msg })
            } else {
                await safeSend(sock, from, { text: '❌ Only image/video statuses can be saved!' }, { quoted: msg })
            }
        } catch (e) {
            await safeSend(sock, from, { text: '❌ Failed to save status!' }, { quoted: msg })
        }
    }

    // ===== MEME =====
    else if (cmd === '.meme') {
        await safeSend(sock, from, { text: '😂 Getting a meme...' }, { quoted: msg })
        const memeUrl = await utils.getMeme()
        if (!memeUrl) return safeSend(sock, from, { text: '❌ No meme found!' }, { quoted: msg })
        const buf = await utils.downloadBuffer(memeUrl)
        if (!buf) return safeSend(sock, from, { text: '❌ Failed to load meme!' }, { quoted: msg })
        await safeSend(sock, from, { image: buf, caption: `😂 *Random Meme!*\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    // ===== WIKI =====
    else if (cmd === '.wiki') {
        if (!query) return safeSend(sock, from, { text: '❌ Usage: .wiki <topic>' }, { quoted: msg })
        await safeSend(sock, from, { text: `🔍 Searching *${query}*...` }, { quoted: msg })
        const result = await utils.getWiki(query)
        if (!result) return safeSend(sock, from, { text: '❌ Nothing found!' }, { quoted: msg })
        await safeSend(sock, from, { text: `📖 *Wikipedia: ${query}*\n\n${result}\n\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    // ===== WEATHER =====
    else if (cmd === '.weather') {
        if (!query) return safeSend(sock, from, { text: '❌ Usage: .weather <city>' }, { quoted: msg })
        const result = await utils.getWeather(query)
        if (!result) return safeSend(sock, from, { text: '❌ City not found!' }, { quoted: msg })
        await safeSend(sock, from, { text: `🌤️ *Weather: ${query}*\n\n${result}\n\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    // ===== CALCULATE =====
    else if (cmd === '.calculate' || cmd === '.calc') {
        if (!query) return safeSend(sock, from, { text: '❌ Usage: .calculate 5+5' }, { quoted: msg })
        try {
            const result = eval(query.replace(/[^0-9+\-*/.()%]/g, ''))
            await safeSend(sock, from, { text: `🧮 *Calculator*\n\n📝 ${query}\n✅ = ${result}\n\n⚡ ${BOT_NAME}` }, { quoted: msg })
        } catch (e) {
            await safeSend(sock, from, { text: '❌ Invalid calculation!' }, { quoted: msg })
        }
    }

    // ===== TIME =====
    else if (cmd === '.time') {
        const now = new Date()
        await safeSend(sock, from, {
            text: `🕐 *Current Time*\n\n📅 ${now.toDateString()}\n⏰ ${now.toTimeString().split(' ')[0]}\n🌍 UTC: ${now.toUTCString()}\n\n⚡ ${BOT_NAME}`
        }, { quoted: msg })
    }

    // ===== FUN COMMANDS =====
    else if (cmd === '.joke' || cmd === '.dadjoke') {
        const joke = await utils.getJoke()
        await safeSend(sock, from, { text: `😂 *Joke!*\n\n${joke}\n\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    else if (cmd === '.funfact') {
        const fact = await utils.getFunFact()
        await safeSend(sock, from, { text: `🤔 *Fun Fact!*\n\n${fact}\n\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    else if (cmd === '.advice') {
        const adv = await utils.getAdvice()
        await safeSend(sock, from, { text: `💡 *Advice!*\n\n${adv}\n\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    else if (cmd === '.quote') {
        const q = await utils.getQuote()
        await safeSend(sock, from, { text: `💬 *Quote*\n\n${q}\n\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    else if (cmd === '.dice') {
        await safeSend(sock, from, { text: `🎲 You rolled: *${Math.floor(Math.random() * 6) + 1}*\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    else if (cmd === '.coin') {
        await safeSend(sock, from, { text: `🪙 *${Math.random() > 0.5 ? 'Heads' : 'Tails'}!*\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    else if (cmd === '.8ball') {
        if (!query) return safeSend(sock, from, { text: '❌ Usage: .8ball <question>' }, { quoted: msg })
        const answer = eightBallAnswers[Math.floor(Math.random() * eightBallAnswers.length)]
        await safeSend(sock, from, { text: `🎱 *8Ball*\n\n❓ ${query}\n\n${answer}\n\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    else if (cmd === '.truth') {
        await safeSend(sock, from, { text: `🤫 *Truth!*\n\n${truths[Math.floor(Math.random() * truths.length)]}\n\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    else if (cmd === '.dare') {
        await safeSend(sock, from, { text: `😈 *Dare!*\n\n${dares[Math.floor(Math.random() * dares.length)]}\n\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    else if (cmd === '.roast') {
        const target = args[1] ? args[1] : pushName
        await safeSend(sock, from, { text: `🔥 *Roast for ${target}*\n\n${roasts[Math.floor(Math.random() * roasts.length)]}\n\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    else if (cmd === '.compliment') {
        const target = args[1] ? args[1] : pushName
        await safeSend(sock, from, { text: `💝 *Compliment for ${target}*\n\n${compliments[Math.floor(Math.random() * compliments.length)]}\n\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    // ===== REACTIONS =====
    else if (reactions[cmd.slice(1)]) {
        const emoji = reactions[cmd.slice(1)]
        const target = args[1] ? args[1] : 'everyone'
        await safeSend(sock, from, { text: `${emoji} *${pushName}* ${cmd.slice(1)}s *${target}*! ${emoji}\n\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    // ===== SUDO =====
    else if (cmd === '.addsudo' && isOwner) {
        let target = args[1]?.replace(/[^0-9]/g, '')
        const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
        if (!target && replyJid) target = replyJid.split('@')[0]
        if (!target) return safeSend(sock, from, { text: '❌ Usage: .addsudo number\nOr reply to message' }, { quoted: msg })
        if (state.sudoUsers.includes(target)) return safeSend(sock, from, { text: `⚠️ Already sudo!` }, { quoted: msg })
        state.sudoUsers.push(target)
        await safeSend(sock, from, { text: `✅ *${target}* is now sudo!\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    else if (cmd === '.delsudo' && isOwner) {
        let target = args[1]?.replace(/[^0-9]/g, '')
        const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
        if (!target && replyJid) target = replyJid.split('@')[0]
        state.sudoUsers = state.sudoUsers.filter(n => n !== target)
        await safeSend(sock, from, { text: `✅ ${target} removed from sudo!` }, { quoted: msg })
    }

    else if (cmd === '.sudolist') {
        if (!state.sudoUsers.length) return safeSend(sock, from, { text: '📋 No sudo users yet.' }, { quoted: msg })
        await safeSend(sock, from, { text: `👥 *Sudo Users:*\n\n${state.sudoUsers.map((n, i) => `${i + 1}. wa.me/${n}`).join('\n')}\n\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    else if (cmd === '.sudo') {
        if (!isPrivileged) return safeSend(sock, from, { text: `❌ Not a sudo user!\nContact: wa.me/${OWNER_NUMBER}` }, { quoted: msg })
        await safeSend(sock, from, { text: `✅ *Sudo Confirmed!*\n\n👤 ${pushName}\n🔑 Level: ${isOwner ? 'Owner 👑' : 'Sudo ⚡'}\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    // ===== BLOCK/UNBLOCK =====
    else if (cmd === '.block' && isOwner) {
        let target = args[1]?.replace(/[^0-9]/g, '')
        const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
        if (!target && replyJid) target = replyJid.split('@')[0]
        if (!target) return safeSend(sock, from, { text: '❌ Usage: .block number' }, { quoted: msg })
        await sock.updateBlockStatus(target + '@s.whatsapp.net', 'block')
        await safeSend(sock, from, { text: `✅ ${target} blocked!` }, { quoted: msg })
    }

    else if (cmd === '.unblock' && isOwner) {
        let target = args[1]?.replace(/[^0-9]/g, '')
        if (!target) return safeSend(sock, from, { text: '❌ Usage: .unblock number' }, { quoted: msg })
        await sock.updateBlockStatus(target + '@s.whatsapp.net', 'unblock')
        await safeSend(sock, from, { text: `✅ ${target} unblocked!` }, { quoted: msg })
    }

    else if (cmd === '.setstatus' && isOwner) {
        if (!query) return safeSend(sock, from, { text: '❌ Usage: .setstatus <text>' }, { quoted: msg })
        await sock.updateProfileStatus(query)
        await safeSend(sock, from, { text: `✅ Status updated!` }, { quoted: msg })
    }

    // ===== GROUP COMMANDS =====
    else if (cmd === '.tagall' && isGroup) {
        const meta = await sock.groupMetadata(from)
        const members = meta.participants.map(p => p.id)
        const text = members.map(m => `@${m.split('@')[0]}`).join(' ')
        await safeSend(sock, from, {
            text: `📢 *Attention Everyone!*\n\n${query || 'Check this out!'}\n\n${text}`,
            mentions: members
        }, { quoted: msg })
    }

    else if (cmd === '.hidetag' && isGroup && isPrivileged) {
        const meta = await sock.groupMetadata(from)
        const members = meta.participants.map(p => p.id)
        await safeSend(sock, from, { text: query || '📢', mentions: members })
    }

    else if (cmd === '.kick' && isGroup && isPrivileged) {
        const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
        let target = args[1]?.replace(/[^0-9]/g, '')
        if (!target && replyJid) target = replyJid.split('@')[0]
        if (!target) return safeSend(sock, from, { text: '❌ Reply or mention someone!' }, { quoted: msg })
        await sock.groupParticipantsUpdate(from, [target + '@s.whatsapp.net'], 'remove')
        await safeSend(sock, from, { text: `✅ ${target} kicked!` }, { quoted: msg })
    }

    else if (cmd === '.promote' && isGroup && isPrivileged) {
        const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
        let target = args[1]?.replace(/[^0-9]/g, '')
        if (!target && replyJid) target = replyJid.split('@')[0]
        if (!target) return safeSend(sock, from, { text: '❌ Reply or mention someone!' }, { quoted: msg })
        await sock.groupParticipantsUpdate(from, [target + '@s.whatsapp.net'], 'promote')
        await safeSend(sock, from, { text: `✅ ${target} promoted to admin!` }, { quoted: msg })
    }

    else if (cmd === '.demote' && isGroup && isPrivileged) {
        const replyJid = msg.message?.extendedTextMessage?.contextInfo?.participant
        let target = args[1]?.replace(/[^0-9]/g, '')
        if (!target && replyJid) target = replyJid.split('@')[0]
        if (!target) return safeSend(sock, from, { text: '❌ Reply or mention someone!' }, { quoted: msg })
        await sock.groupParticipantsUpdate(from, [target + '@s.whatsapp.net'], 'demote')
        await safeSend(sock, from, { text: `✅ ${target} demoted!` }, { quoted: msg })
    }

    else if (cmd === '.mute' && isGroup && isPrivileged) {
        await sock.groupSettingUpdate(from, 'announcement')
        await safeSend(sock, from, { text: '🔇 Group muted!' }, { quoted: msg })
    }

    else if (cmd === '.unmute' && isGroup && isPrivileged) {
        await sock.groupSettingUpdate(from, 'not_announcement')
        await safeSend(sock, from, { text: '🔊 Group unmuted!' }, { quoted: msg })
    }

    else if (cmd === '.gcinfo' && isGroup) {
        const meta = await sock.groupMetadata(from)
        const admins = meta.participants.filter(p => p.admin).length
        await safeSend(sock, from, {
            text: `📊 *Group Info*\n\n📛 ${meta.subject}\n👥 Members: ${meta.participants.length}\n👑 Admins: ${admins}\n🆔 ${from}\n📅 ${new Date(meta.creation * 1000).toDateString()}\n\n⚡ ${BOT_NAME}`
        }, { quoted: msg })
    }

    else if (cmd === '.kickall' && isGroup && isOwner) {
        const meta = await sock.groupMetadata(from)
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net'
        const members = meta.participants.filter(p => !p.admin && p.id !== botId).map(p => p.id)
        await safeSend(sock, from, { text: `⚡ Kicking ${members.length} members...` }, { quoted: msg })
        for (let i = 0; i < members.length; i += 5) {
            await sock.groupParticipantsUpdate(from, members.slice(i, i + 5), 'remove').catch(() => {})
            await humanDelay()
        }
        await safeSend(sock, from, { text: '✅ Done!' }, { quoted: msg })
    }

    else if (cmd === '.listadmins' && isGroup) {
        const meta = await sock.groupMetadata(from)
        const admins = meta.participants.filter(p => p.admin)
        await safeSend(sock, from, {
            text: `👑 *Admins*\n\n${admins.map(a => `@${a.id.split('@')[0]}`).join('\n')}\n\n⚡ ${BOT_NAME}`,
            mentions: admins.map(a => a.id)
        }, { quoted: msg })
    }

    else if (cmd === '.resetlink' && isGroup && isPrivileged) {
        const link = await sock.groupRevokeInvite(from)
        await safeSend(sock, from, { text: `✅ New link:\nhttps://chat.whatsapp.com/${link}` }, { quoted: msg })
    }

    else if (cmd === '.grouplink' && isGroup) {
        const code = await sock.groupInviteCode(from)
        await safeSend(sock, from, { text: `🔗 https://chat.whatsapp.com/${code}\n⚡ ${BOT_NAME}` }, { quoted: msg })
    }

    else if (cmd === '.setgcname' && isGroup && isPrivileged) {
        if (!query) return safeSend(sock, from, { text: '❌ Usage: .setgcname <name>' }, { quoted: msg })
        await sock.groupUpdateSubject(from, query)
        await safeSend(sock, from, { text: `✅ Group name changed to: ${query}` }, { quoted: msg })
    }

    else if (cmd === '.add' && isGroup && isPrivileged) {
        const target = args[1]?.replace(/[^0-9]/g, '')
        if (!target) return safeSend(sock, from, { text: '❌ Usage: .add number' }, { quoted: msg })
        await sock.groupParticipantsUpdate(from, [target + '@s.whatsapp.net'], 'add')
        await safeSend(sock, from, { text: `✅ ${target} added!` }, { quoted: msg })
    }

    // ===== MEDIA TOOLS =====
    else if (cmd === '.autoreply') {
        if (!isPrivileged) return
        state.autoreply[from] = args[1]?.toLowerCase() === 'on'
        await safeSend(sock, from, { text: `${state.autoreply[from] ? '✅ Auto reply ON!' : '❌ Auto reply OFF!'}` }, { quoted: msg })
    }

    else if (cmd === '.antidelete') {
        if (!isPrivileged) return
        state.antiDelete[from] = { enabled: args[1]?.toLowerCase() === 'on' }
        await safeSend(sock, from, { text: `${state.antiDelete[from].enabled ? '✅ Anti-delete ON!' : '❌ Anti-delete OFF!'}` }, { quoted: msg })
    }

    else if (cmd === '.antibadword') {
        if (!isPrivileged) return
        state.antibadword[from] = args[1]?.toLowerCase() === 'on'
        await safeSend(sock, from, { text: `${state.antibadword[from] ? '✅ Anti-badword ON!' : '❌ Anti-badword OFF!'}` }, { quoted: msg })
    }

    else if (cmd === '.autoread') {
        if (!isPrivileged) return
        state.autoread = args[1]?.toLowerCase() === 'on'
        await safeSend(sock, from, { text: `${state.autoread ? '✅ Auto read ON!' : '❌ Auto read OFF!'}` }, { quoted: msg })
    }

    else if (cmd === '.autoreact') {
        if (!isPrivileged) return
        state.autoreact = args[1]?.toLowerCase() === 'on'
        await safeSend(sock, from, { text: `${state.autoreact ? '✅ Auto react ON!' : '❌ Auto react OFF!'}` }, { quoted: msg })
    }

    else if (cmd === '.autotyping') {
        if (!isPrivileged) return
        state.autotyping = args[1]?.toLowerCase() === 'on'
        await safeSend(sock, from, { text: `${state.autotyping ? '✅ Auto typing ON!' : '❌ Auto typing OFF!'}` }, { quoted: msg })
    }

    else if (cmd === '.antilink') {
        if (!isPrivileged) return
        state.antilink[from] = args[1]?.toLowerCase() === 'on'
        await safeSend(sock, from, { text: `${state.antilink[from] ? '✅ Anti-link ON!' : '❌ Anti-link OFF!'}` }, { quoted: msg })
    }

    else if (cmd === '.antispam') {
        if (!isPrivileged) return
        state.antispam[from] = args[1]?.toLowerCase() === 'on'
        await safeSend(sock, from, { text: `${state.antispam[from] ? '✅ Anti-spam ON!' : '❌ Anti-spam OFF!'}` }, { quoted: msg })
    }

    return true
}

module.exports = { handleCommand }
