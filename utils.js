const axios = require('axios')
const { UNSPLASH_KEY } = require('./config')

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

async function askAI(prompt) {
    try {
        const res = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, {
            timeout: 30000,
            headers: { 'Accept': 'text/plain' }
        })
        return res.data || 'No response from AI.'
    } catch (e) {
        return '❌ AI is busy. Try again later!'
    }
}

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

async function downloadBuffer(url) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 })
        return Buffer.from(res.data)
    } catch (e) { return null }
}

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

async function getWeather(city) {
    try {
        const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=4`, { timeout: 10000 })
        return res.data
    } catch (e) { return null }
}

async function getWiki(query) {
    try {
        const res = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`, { timeout: 10000 })
        return res.data.extract || null
    } catch (e) { return null }
}

async function getJoke() {
    try {
        const res = await axios.get('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist&type=single', { timeout: 10000 })
        return res.data.joke || null
    } catch (e) { return '😂 Why did the bot cross the road? To get to the other side!' }
}

async function getFunFact() {
    try {
        const res = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en', { timeout: 10000 })
        return res.data.text || null
    } catch (e) { return '🤔 Did you know? TAVIK BOT is the best bot ever!' }
}

async function getAdvice() {
    try {
        const res = await axios.get('https://api.adviceslip.com/advice', { timeout: 10000 })
        return res.data.slip.advice || null
    } catch (e) { return '💡 Always be yourself!' }
}

async function getQuote() {
    try {
        const res = await axios.get('https://api.quotable.io/random', { timeout: 10000 })
        return `"${res.data.content}" - ${res.data.author}` || null
    } catch (e) { return '"Success is not final, failure is not fatal." - Winston Churchill' }
}

async function getMeme() {
    try {
        const res = await axios.get('https://meme-api.com/gimme', { timeout: 10000 })
        return res.data?.url || null
    } catch (e) { return null }
}

async function downloadTiktok(url) {
    try {
        const res = await axios.get(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`, { timeout: 20000 })
        return res.data?.video?.noWatermark || res.data?.video?.cover || null
    } catch (e) { return null }
}

module.exports = {
    getUptime,
    askAI,
    searchImage,
    downloadBuffer,
    upscaleImage,
    getWeather,
    getWiki,
    getJoke,
    getFunFact,
    getAdvice,
    getQuote,
    getMeme,
    downloadTiktok,
}
