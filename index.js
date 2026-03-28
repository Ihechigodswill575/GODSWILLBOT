/**
 * ============================================================
 *  TAVIK BOT — index.js
 *  Author  : GODSWILL (TAVIK)
 *  Engine  : TAVIK TECH
 * ============================================================
 */

'use strict'

const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys')
const { Boom }           = require('@hapi/boom')
const pino               = require('pino')
const http               = require('http')
const fs                 = require('fs')
const { handleMessage }  = require('./handler')
const { BOT_NAME, OWNER_NAME, OWNER_NUMBER } = require('./config')
const state              = require('./state')

// ── Constants ────────────────────────────────────────────────
const PORT           = process.env.PORT || 3000
const AUTH_FOLDER    = 'auth_info'
const MAX_RETRIES    = 10
const logger         = pino({ level: 'silent' })
const PAIRING_NUMBER = OWNER_NUMBER.replace(/[^0-9]/g, '') // digits only

// ── Runtime state ────────────────────────────────────────────
let isConnected   = false
let retryCount    = 0
let currentSock   = null
let pairingTimer  = null
let pairingShown  = false  // ensures we only start the pairing flow once per boot

// ── Keep-alive server — boots ONCE ───────────────────────────
const server = http.createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end(
        `${BOT_NAME}\n` +
        `Status : ${isConnected ? 'Connected ✅' : 'Connecting... 🔄'}\n` +
        `Owner  : ${OWNER_NAME}`
    )
})
server.on('error', e => console.error(`[SERVER] ${e.message}`))
server.listen(PORT, () => console.log(`[SERVER] Running on port ${PORT}`))

// ── Helpers ──────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

function stopPairingTimer() {
    if (pairingTimer) {
        clearInterval(pairingTimer)
        pairingTimer = null
    }
}

function clearSession() {
    try {
        if (fs.existsSync(AUTH_FOLDER)) {
            fs.rmSync(AUTH_FOLDER, { recursive: true, force: true })
            console.log('[AUTH] Session cleared.')
        }
    } catch (e) {
        console.error(`[AUTH] ${e.message}`)
    }
}

function destroySocket() {
    if (currentSock) {
        try { currentSock.ev.removeAllListeners() } catch (_) {}
        try { currentSock.ws?.close()             } catch (_) {}
        currentSock = null
    }
}

function reconnect(delayMs) {
    console.log(`[BOT] Reconnecting in ${delayMs / 1000}s...`)
    setTimeout(startBot, delayMs)
}

// ── Pairing — triggered AFTER 'connecting' event fires ───────
// This is the correct time per Baileys docs.
// Code refreshes every 55s since WhatsApp codes expire in ~60s.
async function startPairing(sock) {
    if (pairingShown) return
    pairingShown = true
    stopPairingTimer()

    const showCode = async () => {
        if (isConnected || currentSock !== sock) {
            stopPairingTimer()
            return
        }
        try {
            const code      = await sock.requestPairingCode(PAIRING_NUMBER)
            const formatted = code.match(/.{1,4}/g)?.join('-') || code
            console.log('\n┌─────────────────────────────────┐')
            console.log(`│     🔑  TAVIK BOT Pairing Code   │`)
            console.log(`│                                  │`)
            console.log(`│         ${formatted.padEnd(23)}│`)
            console.log(`│                                  │`)
            console.log('│  1. Open WhatsApp on your phone  │')
            console.log('│  2. Tap ⋮ → Linked Devices       │')
            console.log('│  3. Tap "Link a Device"          │')
            console.log('│  4. Enter the code above NOW     │')
            console.log('│                                  │')
            console.log('│  ⏳ Refreshes automatically       │')
            console.log('└─────────────────────────────────┘\n')
        } catch (e) {
            console.error(`[PAIRING] Failed: ${e.message}`)
            pairingShown = false // allow retry
        }
    }

    // Show first code immediately
    await showCode()

    // Refresh every 55s automatically
    pairingTimer = setInterval(showCode, 55_000)
}

// ── Main bot ──────────────────────────────────────────────────
async function startBot() {
    destroySocket()
    stopPairingTimer()

    try {
        const { version }                     = await fetchLatestBaileysVersion()
        const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER)

        const sock = makeWASocket({
            version,
            auth: {
                creds: authState.creds,
                keys : makeCacheableSignalKeyStore(authState.keys, logger),
            },
            printQRInTerminal  : false,
            logger,
            browser            : [BOT_NAME, 'Chrome', '120.0.0'],
            connectTimeoutMs   : 60_000,
            keepAliveIntervalMs: 25_000,
            retryRequestDelayMs: 2_000,
            maxMsgRetryCount   : 3,
            syncFullHistory    : false,
            markOnlineOnConnect: false,
        })

        currentSock = sock
        sock.ev.on('creds.update', saveCreds)

        // ── Connection events ───────────────────────────────
        sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {

            // ✅ CORRECT: request pairing AFTER 'connecting' fires
            // This is when WhatsApp has handshaked and is ready
            if (connection === 'connecting') {
                console.log('[BOT] Connecting to WhatsApp...')
                if (!sock.authState.creds.registered && !pairingShown) {
                    await sleep(2000) // small wait for handshake to complete
                    startPairing(sock)
                }
            }

            if (connection === 'open') {
                isConnected  = true
                retryCount   = 0
                pairingShown = true
                stopPairingTimer()
                console.log(`\n╔══════════════════════════════╗`)
                console.log(`║   ✅  ${BOT_NAME} is LIVE!      ║`)
                console.log(`║   Owner  : ${OWNER_NAME.padEnd(18)}║`)
                console.log(`║   Number : ${sock.user?.id?.split(':')[0]?.padEnd(18)}║`)
                console.log(`║   Engine : TAVIK TECH         ║`)
                console.log(`╚══════════════════════════════╝\n`)
            }

            if (connection === 'close') {
                isConnected = false
                stopPairingTimer()

                const boom = lastDisconnect?.error
                const code = (boom instanceof Boom)
                    ? boom.output?.statusCode
                    : 500

                console.log(`[BOT] Disconnected — code ${code}`)

                switch (code) {

                    case DisconnectReason.loggedOut:
                        console.log('[BOT] Logged out. Clearing session...')
                        clearSession()
                        pairingShown = false
                        retryCount   = 0
                        reconnect(3_000)
                        break

                    case DisconnectReason.connectionReplaced:
                        console.log('[BOT] Another device connected. Halting.')
                        break

                    case DisconnectReason.badSession:
                        console.log('[BOT] Bad session. Clearing...')
                        clearSession()
                        pairingShown = false
                        reconnect(5_000)
                        break

                    case DisconnectReason.timedOut:
                    case DisconnectReason.connectionClosed:
                    case DisconnectReason.connectionLost:
                    default:
                        retryCount++
                        if (retryCount <= MAX_RETRIES) {
                            const delay = Math.min(retryCount * 4_000, 30_000)
                            console.log(`[BOT] Retry ${retryCount}/${MAX_RETRIES}`)
                            reconnect(delay)
                        } else {
                            console.log('[BOT] Max retries. Cooling down 60s...')
                            retryCount = 0
                            reconnect(60_000)
                        }
                }
            }
        })

        // ── Anti-delete ─────────────────────────────────────
        sock.ev.on('messages.delete', async (item) => {
            try {
                if (!item?.keys) return
                for (const key of item.keys) {
                    const jid = key.remoteJid
                    if (!state.antiDelete[jid]?.enabled) continue
                    await sock.sendMessage(`${PAIRING_NUMBER}@s.whatsapp.net`, {
                        text: `🗑️ *Anti-Delete Alert*\nChat : ${jid}\nBy   : ${key.participant || jid}`
                    })
                }
            } catch (_) {}
        })

        // ── Message router ──────────────────────────────────
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return
            const msg = messages[0]
            if (!msg || msg.key.fromMe) return
            await handleMessage(sock, msg)
        })

    } catch (e) {
        console.error(`[BOOT] ${e.message}`)
        reconnect(5_000)
    }
}

// ── Boot ─────────────────────────────────────────────────────
console.log(`\n🚀 ${BOT_NAME} starting...`)
console.log(`   Owner  : ${OWNER_NAME}`)
console.log(`   Engine : TAVIK TECH\n`)

startBot()
