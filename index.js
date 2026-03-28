const { makeWASocket, useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const http = require('http')
const fs = require('fs')
const { handleMessage } = require('./handler')
const { BOT_NAME, OWNER_NAME } = require('./config')
const state = require('./state')

// ======================================================
//  CONSTANTS
// ======================================================
const OWNER_NUMBER = '2348145688688'
const MAX_RECONNECT = 10
const PORT = process.env.PORT || 3000

// ======================================================
//  STATE
// ======================================================
let isConnected = false
let reconnectAttempts = 0
let pairingRequested = false  // ensures pairing code is only requested ONCE per session

// ======================================================
//  KEEP-ALIVE SERVER — starts once, never restarts
// ======================================================
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end([
        `${BOT_NAME} ⚡`,
        `Status : ${isConnected ? '🟢 Connected' : '🔴 Connecting...'}`,
        `Owner  : ${OWNER_NAME}`,
    ].join('\n'))
})

server.on('error', (err) => {
    console.error(`[SERVER] Error: ${err.message}`)
})

server.listen(PORT, () => {
    console.log(`[SERVER] Keep-alive listening on port ${PORT}`)
})

// ======================================================
//  HELPERS
// ======================================================
function clearSession() {
    try {
        if (fs.existsSync('auth_info')) {
            fs.rmSync('auth_info', { recursive: true, force: true })
            console.log('[AUTH] Session cleared.')
        }
    } catch (err) {
        console.error('[AUTH] Failed to clear session:', err.message)
    }
}

function scheduleReconnect(delayMs) {
    console.log(`[BOT] Reconnecting in ${delayMs / 1000}s...`)
    setTimeout(startBot, delayMs)
}

// ======================================================
//  REQUEST PAIRING CODE — only once per boot
// ======================================================
async function requestPairing(sock) {
    if (pairingRequested) return
    pairingRequested = true

    // Wait 5s for connection to stabilise before requesting
    await new Promise(r => setTimeout(r, 5000))

    if (isConnected) return // already connected, no need

    try {
        const code = await sock.requestPairingCode(OWNER_NUMBER)
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`  🔑 ${BOT_NAME} Pairing Code`)
        console.log(`     ${code}`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('  Open WhatsApp → Linked Devices')
        console.log('  → Link a Device → Enter code above')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    } catch (err) {
        console.error('[PAIRING] Failed to get pairing code:', err.message)
        pairingRequested = false // allow retry on next reconnect
    }
}

// ======================================================
//  MAIN BOT FUNCTION
// ======================================================
async function startBot() {
    const { state: authState, saveCreds } = await useMultiFileAuthState('auth_info')

    const sock = makeWASocket({
        auth: {
            creds: authState.creds,
            keys: makeCacheableSignalKeyStore(authState.keys, pino({ level: 'silent' }))
        },
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: [BOT_NAME, 'Chrome', '120.0.0'],
        connectTimeoutMs: 60_000,
        keepAliveIntervalMs: 10_000,
        retryRequestDelayMs: 2_000,
        maxMsgRetryCount: 5,
        syncFullHistory: false,
        markOnlineOnConnect: false,
    })

    // Save credentials whenever they update
    sock.ev.on('creds.update', saveCreds)

    // Request pairing code if not yet registered
    if (!sock.authState.creds.registered) {
        requestPairing(sock)
    }

    // ── Connection events ──────────────────────────────
    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {

        if (connection === 'connecting') {
            console.log('[BOT] Connecting to WhatsApp...')
        }

        if (connection === 'open') {
            isConnected = true
            reconnectAttempts = 0
            pairingRequested = true // stop any pending pairing attempts
            console.log(`\n✅ ${BOT_NAME} Connected!`)
            console.log(`   Owner  : ${OWNER_NAME}`)
            console.log(`   Number : ${sock.user?.id?.split(':')[0]}`)
            console.log(`   Engine : TAVIK TECH\n`)
        }

        if (connection === 'close') {
            isConnected = false
            const statusCode = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output?.statusCode
                : 500

            console.log(`[BOT] Disconnected — status ${statusCode}`)

            switch (statusCode) {

                case DisconnectReason.loggedOut:
                    console.log('[BOT] Logged out. Clearing session and restarting...')
                    clearSession()
                    pairingRequested = false
                    scheduleReconnect(3_000)
                    break

                case DisconnectReason.connectionReplaced:
                    console.log('[BOT] Session opened on another device. Stopping.')
                    break

                case DisconnectReason.timedOut:
                    console.log('[BOT] Connection timed out.')
                    scheduleReconnect(5_000)
                    break

                case DisconnectReason.connectionClosed:
                case DisconnectReason.connectionLost:
                    reconnectAttempts++
                    if (reconnectAttempts <= MAX_RECONNECT) {
                        const delay = Math.min(reconnectAttempts * 3_000, 30_000)
                        console.log(`[BOT] Attempt ${reconnectAttempts}/${MAX_RECONNECT}`)
                        scheduleReconnect(delay)
                    } else {
                        console.log('[BOT] Max reconnect attempts reached. Waiting 60s...')
                        reconnectAttempts = 0
                        scheduleReconnect(60_000)
                    }
                    break

                default:
                    scheduleReconnect(5_000)
            }
        }
    })

    // ── Anti-delete handler ────────────────────────────
    sock.ev.on('messages.delete', async (item) => {
        try {
            if (!item.keys) return
            for (const key of item.keys) {
                const jid = key.remoteJid
                if (state.antiDelete[jid]?.enabled) {
                    await sock.sendMessage(`${OWNER_NUMBER}@s.whatsapp.net`, {
                        text: `🗑️ *Anti-Delete Alert*\nChat: ${jid}\nBy: ${key.participant || jid}`
                    })
                }
            }
        } catch (_) {}
    })

    // ── Message handler ────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0]
        if (!msg || msg.key.fromMe) return
        await handleMessage(sock, msg)
    })
}

// ======================================================
//  BOOT
// ======================================================
console.log(`\n🚀 Starting ${BOT_NAME}...`)
console.log(`   Owner  : ${OWNER_NAME}`)
console.log(`   Engine : TAVIK TECH\n`)

startBot().catch((err) => {
    console.error('[BOOT] Fatal error:', err.message)
    setTimeout(startBot, 5_000)
})
