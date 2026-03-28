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
const { Boom }        = require('@hapi/boom')
const pino            = require('pino')
const http            = require('http')
const fs              = require('fs')
const { handleMessage } = require('./handler')
const { BOT_NAME, OWNER_NAME, OWNER_NUMBER } = require('./config')
const state           = require('./state')

// ── Constants ────────────────────────────────────────────────
const PORT         = process.env.PORT || 3000
const AUTH_FOLDER  = 'auth_info'
const MAX_RETRIES  = 10
const logger       = pino({ level: 'silent' })

// ── Runtime state ────────────────────────────────────────────
let isConnected      = false
let retryCount       = 0
let currentSock      = null   // track active socket so we can close it cleanly
let pairingDone      = false  // true once code shown OR session already exists

// ── Keep-alive server (starts ONCE at boot, never again) ─────
const server = http.createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end(
        `${BOT_NAME}\n` +
        `Status : ${isConnected ? 'Connected ✅' : 'Connecting... 🔄'}\n` +
        `Owner  : ${OWNER_NAME}`
    )
})

server.on('error', err => console.error(`[SERVER] ${err.message}`))
server.listen(PORT, () => console.log(`[SERVER] Running on port ${PORT}`))

// ── Helpers ──────────────────────────────────────────────────
function log(tag, msg)  { console.log(`[${tag}] ${msg}`) }
function err(tag, msg)  { console.error(`[${tag}] ${msg}`) }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function clearSession() {
    try {
        if (fs.existsSync(AUTH_FOLDER)) {
            fs.rmSync(AUTH_FOLDER, { recursive: true, force: true })
            log('AUTH', 'Session cleared.')
        }
    } catch (e) {
        err('AUTH', `Could not clear session: ${e.message}`)
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
    log('BOT', `Next attempt in ${delayMs / 1000}s...`)
    setTimeout(startBot, delayMs)
}

// ── Pairing — requested exactly once, only when needed ───────
async function requestPairing(sock) {
    if (pairingDone) return
    pairingDone = true

    // Give WhatsApp 8 seconds to attempt auto-login first
    await sleep(8000)

    // If bot connected during that wait, no pairing needed
    if (isConnected) return

    try {
        const code = await sock.requestPairingCode(OWNER_NUMBER)
        console.log('\n╔══════════════════════════════╗')
        console.log(`║   🔑  ${BOT_NAME} Pairing Code   ║`)
        console.log(`║        ${code.padEnd(20)}  ║`)
        console.log('╠══════════════════════════════╣')
        console.log('║  WhatsApp → Linked Devices   ║')
        console.log('║  → Link a Device → Enter code║')
        console.log('╚══════════════════════════════╝\n')
    } catch (e) {
        err('PAIRING', e.message)
        pairingDone = false   // reset so next reconnect can try again
    }
}

// ── Main bot function ─────────────────────────────────────────
async function startBot() {
    // Clean up any previous socket before making a new one
    destroySocket()

    try {
        const { version } = await fetchLatestBaileysVersion()
        const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER)

        const sock = makeWASocket({
            version,
            auth: {
                creds: authState.creds,
                keys: makeCacheableSignalKeyStore(authState.keys, logger),
            },
            printQRInTerminal : false,
            logger,
            browser           : [BOT_NAME, 'Chrome', '120.0.0'],
            connectTimeoutMs  : 60_000,
            keepAliveIntervalMs: 25_000,
            retryRequestDelayMs: 2_000,
            maxMsgRetryCount  : 3,
            syncFullHistory   : false,
            markOnlineOnConnect: false,
        })

        currentSock = sock
        sock.ev.on('creds.update', saveCreds)

        // Only request pairing if not already registered
        if (!sock.authState.creds.registered) {
            requestPairing(sock)
        } else {
            pairingDone = true  // session exists, no pairing needed
        }

        // ── Connection handler ──────────────────────────────
        sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {

            if (connection === 'connecting') {
                log('BOT', 'Connecting to WhatsApp...')
            }

            if (connection === 'open') {
                isConnected  = true
                retryCount   = 0
                pairingDone  = true
                console.log(`\n✅ ${BOT_NAME} is LIVE`)
                console.log(`   Owner  : ${OWNER_NAME}`)
                console.log(`   Number : ${sock.user?.id?.split(':')[0]}`)
                console.log(`   Engine : TAVIK TECH\n`)
            }

            if (connection === 'close') {
                isConnected = false
                const boom  = lastDisconnect?.error
                const code  = (boom instanceof Boom)
                    ? boom.output?.statusCode
                    : 500

                log('BOT', `Disconnected — code ${code}`)

                switch (code) {

                    case DisconnectReason.loggedOut:
                        log('BOT', 'Logged out. Clearing session...')
                        clearSession()
                        pairingDone = false   // allow fresh pairing
                        retryCount  = 0
                        reconnect(3_000)
                        break

                    case DisconnectReason.connectionReplaced:
                        log('BOT', 'Another device took over. Halting.')
                        // Do NOT reconnect
                        break

                    case DisconnectReason.badSession:
                        log('BOT', 'Bad session. Clearing and restarting...')
                        clearSession()
                        pairingDone = false
                        reconnect(5_000)
                        break

                    case DisconnectReason.timedOut:
                    case DisconnectReason.connectionClosed:
                    case DisconnectReason.connectionLost:
                    default:
                        retryCount++
                        if (retryCount <= MAX_RETRIES) {
                            const delay = Math.min(retryCount * 4_000, 30_000)
                            log('BOT', `Retry ${retryCount}/${MAX_RETRIES}`)
                            reconnect(delay)
                        } else {
                            log('BOT', 'Max retries hit. Cooling down 60s...')
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
                    await sock.sendMessage(`${OWNER_NUMBER}@s.whatsapp.net`, {
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
        err('BOOT', e.message)
        reconnect(5_000)
    }
}

// ── Boot ─────────────────────────────────────────────────────
console.log(`\n🚀 ${BOT_NAME} starting...`)
console.log(`   Owner  : ${OWNER_NAME}`)
console.log(`   Engine : TAVIK TECH\n`)

startBot()
