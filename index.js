const { makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const http = require('http')
const { handleMessage } = require('./handler')
const { BOT_NAME, OWNER_NAME } = require('./config')
const state = require('./state')

// ======= SESSION VARIABLES =======
let reconnectAttempts = 0
const MAX_RECONNECT = 10
let pairingInterval = null
let isConnected = false

function clearPairingInterval() {
    if (pairingInterval) {
        clearInterval(pairingInterval)
        pairingInterval = null
    }
}

// ======= KEEP ALIVE SERVER (outside startBot so it only starts once) =======
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end(`${BOT_NAME} is Running! ⚡\nStatus: ${isConnected ? '🟢 Connected' : '🔴 Connecting...'}\nOwner: ${OWNER_NAME}`)
})

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log('⚠️ Port already in use, skipping server start...')
    } else {
        console.log('Server error:', e.message)
    }
})

server.listen(process.env.PORT || 3000, () => {
    console.log(`🌐 Keep-alive server running on port ${process.env.PORT || 3000}`)
})

async function startBot() {
    const { state: authState, saveCreds } = await useMultiFileAuthState('auth_info')

    const sock = makeWASocket({
        auth: {
            creds: authState.creds,
            keys: makeCacheableSignalKeyStore(authState.keys, pino({ level: 'silent' }))
        },
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['TAVIK BOT', 'Chrome', '120.0.0'],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        retryRequestDelayMs: 2000,
        maxMsgRetryCount: 5,
        syncFullHistory: false,
        markOnlineOnConnect: false,
    })

    sock.ev.on('creds.update', saveCreds)

    // ======= SMART PAIRING =======
    if (!sock.authState.creds.registered) {
        const number = '2348145688688'
        clearPairingInterval()

        const showCode = async () => {
            if (isConnected) { clearPairingInterval(); return }
            try {
                const code = await sock.requestPairingCode(number)
                console.log(`\n━━━━━━━━━━━━━━━━━━━━━━`)
                console.log(`🔑 TAVIK BOT Pairing Code:`)
                console.log(`        ${code}`)
                console.log(`━━━━━━━━━━━━━━━━━━━━━━`)
                console.log(`⏳ Refreshes in 45s...\n`)
            } catch (e) {
                console.log('⚠️ Pairing error:', e.message)
            }
        }

        // Show first code after 3 seconds
        setTimeout(showCode, 3000)

        // Refresh every 45 seconds
        pairingInterval = setInterval(async () => {
            if (!sock.authState.creds.registered && !isConnected) {
                await showCode()
            } else {
                clearPairingInterval()
            }
        }, 45000)
    }

    // ======= SMART CONNECTION HANDLER =======
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'connecting') {
            console.log('🔄 Connecting to WhatsApp...')
        }

        if (connection === 'open') {
            isConnected = true
            reconnectAttempts = 0
            clearPairingInterval()
            console.log(`\n✅ ${BOT_NAME} Connected Successfully!`)
            console.log(`👑 Owner: ${OWNER_NAME}`)
            console.log(`⚡ Powered by TAVIK TECH`)
            console.log(`🛡️ Anti-Ban: Active`)
            console.log(`📱 Number: ${sock.user?.id?.split(':')[0]}\n`)
        }

        if (connection === 'close') {
            isConnected = false
            const statusCode = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output?.statusCode
                : 500

            const reason = DisconnectReason

            console.log(`\n❌ Disconnected! Status: ${statusCode}`)

            if (statusCode === reason.loggedOut) {
                console.log('🚪 Logged out! Session cleared. Restarting...')
                try {
                    const fs = require('fs')
                    if (fs.existsSync('auth_info')) {
                        fs.rmSync('auth_info', { recursive: true })
                        console.log('🗑️ Session cleared!')
                    }
                } catch (e) {}
                setTimeout(startBot, 3000)

            } else if (statusCode === reason.connectionReplaced) {
                console.log('📱 Connection replaced by another device!')

            } else if (statusCode === reason.timedOut) {
                console.log('⏰ Connection timed out. Reconnecting...')
                setTimeout(startBot, 5000)

            } else if (statusCode === reason.connectionClosed) {
                console.log('🔌 Connection closed. Reconnecting...')
                if (reconnectAttempts < MAX_RECONNECT) {
                    reconnectAttempts++
                    const delay = Math.min(reconnectAttempts * 3000, 30000)
                    console.log(`🔄 Attempt ${reconnectAttempts}/${MAX_RECONNECT} in ${delay/1000}s...`)
                    setTimeout(startBot, delay)
                } else {
                    console.log('❌ Max reconnect attempts reached!')
                    reconnectAttempts = 0
                    setTimeout(startBot, 60000)
                }

            } else {
                console.log('🔄 Unknown disconnect. Reconnecting in 5s...')
                setTimeout(startBot, 5000)
            }
        }
    })

    // ======= ANTI DELETE HANDLER =======
    sock.ev.on('messages.delete', async (item) => {
        try {
            if (!item.keys) return
            for (const key of item.keys) {
                const jid = key.remoteJid
                if (state.antiDelete[jid]?.enabled) {
                    await sock.sendMessage('2348145688688@s.whatsapp.net', {
                        text: `🗑️ *Anti-Delete Alert!*\nDeleted in: ${jid}\nBy: ${key.participant || jid}`
                    })
                }
            }
        } catch (e) {}
    })

    // ======= MESSAGE HANDLER =======
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg || msg.key.fromMe) return
        await handleMessage(sock, msg)
    })

    console.log(`\n🚀 ${BOT_NAME} Starting...`)
    console.log(`👑 Owner: ${OWNER_NAME}`)
    console.log(`⚡ Powered by TAVIK TECH\n`)
}

// Start the bot
startBot().catch(err => {
    console.log('Startup error:', err.message)
    setTimeout(startBot, 5000)
})
