// ======= ANTI-BAN PROTECTION FOR TAVIK BOT =======

const messageCount = {}
const lastMessageTime = {}

// Delay between messages to avoid ban
const SAFE_DELAY = 1000 // 1 second between messages
const MAX_MESSAGES_PER_MINUTE = 20 // Max messages per minute
const FLOOD_DELAY = 300 // Delay between flood messages

// Track message rate
function trackMessage(jid) {
    const now = Date.now()
    if (!messageCount[jid]) {
        messageCount[jid] = { count: 0, resetTime: now + 60000 }
    }
    if (now > messageCount[jid].resetTime) {
        messageCount[jid] = { count: 0, resetTime: now + 60000 }
    }
    messageCount[jid].count++
    return messageCount[jid].count
}

// Check if sending too fast
function isSendingTooFast(jid) {
    const count = trackMessage(jid)
    return count > MAX_MESSAGES_PER_MINUTE
}

// Safe delay between messages
function safeDelay(ms = SAFE_DELAY) {
    return new Promise(r => setTimeout(r, ms))
}

// Random delay to look more human
function humanDelay() {
    const delay = Math.floor(Math.random() * 1000) + 500 // 500-1500ms
    return new Promise(r => setTimeout(r, delay))
}

// Safe send message with anti-ban
async function safeSend(sock, jid, content, options = {}) {
    try {
        // Add human-like delay
        await humanDelay()
        
        // Send typing indicator
        await sock.sendPresenceUpdate('composing', jid)
        await safeDelay(500)
        await sock.sendPresenceUpdate('paused', jid)

        return await sock.sendMessage(jid, content, options)
    } catch (e) {
        console.log('SafeSend error:', e.message)
        return null
    }
}

// Anti-ban flood protection
async function safeFLood(sock, jid, payloads, count = 50) {
    let sent = 0
    for (let i = 0; i < count; i++) {
        try {
            await sock.sendMessage(jid, payloads[i % payloads.length]())
            await safeDelay(FLOOD_DELAY) // Wait between flood messages
            sent++
        } catch (e) {
            await safeDelay(500)
        }
    }
    return sent
}

module.exports = {
    safeSend,
    safeFLood,
    safeDelay,
    humanDelay,
    isSendingTooFast,
    SAFE_DELAY,
    FLOOD_DELAY,
}
