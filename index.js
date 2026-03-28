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
const PORT        = process.env.PORT || 3000
const AUTH_FOLDER = 'auth_info'
const MAX_RETRIES = 10
const logger      = pino({ level: 'silent' })

// Baileys requires the number with no + or spaces
// e.g. '2348145688688' — digits only
const PAIRING_NUMBER = OWNER_NUMBER.replace(/[^0-9]/g, '')

// ── Runtime state ────────────────────────────────────────────
let isConnected   = false
let retryCount    = 0
let currentSock   = null
let pairingTimer  = null   // holds the setInterval for code refresh

// ── Keep-alive server — boots ONCE, never restarts ───────────
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

// ── Pairing code — shows once, then refreshes every 55s ──────
// WhatsApp codes expire after ~60 seconds.
// We refresh every 55s so the user always has a valid code.
async function startPairing(sock) {
    stopPairingTimer() // clear any old timer first

    const showCode = async () => {
        // If already connected or socket changed, stop
        if (isConnected || currentSock !== sock) {
            stopPairingTimer()
            return
        }
        try {
            const code = await sock.requestPairingCode(PAIRING_NUMBER)
            const formatted = code.match(/.{1,4}/g)?.join('-') || code
            console.log('\n┌─────────────────────────────────┐')
            console.log(`│   🔑  TAVIK BOT — Pairing Code   │`)
            console.log(`│                                  │`)
            console.log(`│        ${formatted.padEnd(24)}│`)
            console.log(`│                                  │`)
            console.log('│  1. Open WhatsApp on your phone  │')
            console.log('│  2. Tap ⋮ → Linked Devices       │')
            console.log('│  3. Tap "Link a Device"          │')
            console.log('│  4. Enter the code above         │')
            console.log('│                                  │')
            console.log('│  ⏳ Code refreshes in 55s        │')
            console.log('└─────────────────────────────────┘\n')
        } catch (e) {
            console.error(`[PAIRING] ${e.message} — retrying in 55s`)
        }
    }

    // Show immediately (after 5s warmup for connection to stabilise)
    await sleep(5000)
    if (isConnected) return   // connected during warmup — no pairing needed
    await showCode()

    // Then refresh every 55 seconds automatically
    pairingTimer = setInterval(showCode, 55_000)
}

// ── Main bot function ─────────────────────────────────────────
async function startBot() {
    destroySocket()
    stopPairingTimer()

    try {
        const { version }                    = await fetchLatestBaileysVersion()
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

        // Start pairing flow only if no session exists
        if (!sock.authState.creds.registered) {
            startPairing(sock)
        }

        // ── Connection events ───────────────────────────────
        sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {

            if (connection === 'connecting') {
                console.log('[BOT] Connecting to WhatsApp...')
            }

            if (connection === 'open') {
                isConnected = true
                retryCount  = 0
                stopPairingTimer()
                console.log(`\n╔══════════════════════════════╗`)
                console.log(`║  ✅  ${BOT_NAME} is LIVE!         ║`)
                console.log(`║  Owner  : ${OWNER_NAME.padEnd(19)}║`)
                console.log(`║  Number : ${sock.user?.id?.split(':')[0]?.padEnd(19)}║`)
                console.log(`║  Engine : TAVIK TECH          ║`)
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
                        retryCount = 0
                        reconnect(3_000)
                        break

                    case DisconnectReason.connectionReplaced:
                        console.log('[BOT] Another device connected. Halting.')
                        // Do NOT reconnect
                        break

                    case DisconnectReason.badSession:
                        console.log('[BOT] Bad session. Clearing and restarting...')
                        clearSession()
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
                            console.log('[BOT] Max retries hit. Cooling down 60s...')
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
                        text : `🗑️ *Anti-Delete Alert*\nChat : ${jid}\nBy   : ${key.participant || jid}`
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
