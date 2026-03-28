// ======= TAVIK BOT API FUNCTIONS =======
const axios = require('axios')

// Free AI - Pollinations
async function askAI(prompt) {
    try {
        const res = await axios.get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, {
            timeout: 30000
        })
        return res.data || '❌ No response!'
    } catch (e) {
        return '❌ AI unavailable. Try again!'
    }
}

// Wikipedia
async function wiki(query) {
    try {
        const res = await axios.get(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`,
            { timeout: 10000 }
        )
        return res.data.extract || null
    } catch (e) { return null }
}

// Weather
async function weather(city) {
    try {
        const res = await axios.get(
            `https://wttr.in/${encodeURIComponent(city)}?format=4`,
            { timeout: 10000 }
        )
        return res.data || null
    } catch (e) { return null }
}

// Joke
async function joke() {
    try {
        const res = await axios.get(
            'https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist&type=single',
            { timeout: 10000 }
        )
        return res.data.joke || null
    } catch (e) { return '😂 Why did the bot cross the road? To get to the other side!' }
}

// Fun fact
async function funfact() {
    try {
        const res = await axios.get(
            'https://uselessfacts.jsph.pl/random.json?language=en',
            { timeout: 10000 }
        )
        return res.data.text || null
    } catch (e) { return '🤔 TAVIK BOT is the best bot ever!' }
}

// Advice
async function advice() {
    try {
        const res = await axios.get('https://api.adviceslip.com/advice', { timeout: 10000 })
        return res.data.slip.advice || null
    } catch (e) { return '💡 Always be yourself!' }
}

// Quote
async function quote() {
    try {
        const res = await axios.get('https://api.quotable.io/random', { timeout: 10000 })
        return `"${res.data.content}" — ${res.data.author}` || null
    } catch (e) { return '"Success is not final." - Churchill' }
}

// Meme
async function meme() {
    try {
        const res = await axios.get('https://meme-api.com/gimme', { timeout: 10000 })
        return res.data?.url || null
    } catch (e) { return null }
}

// TikTok downloader
async function tiktok(url) {
    try {
        const res = await axios.get(
            `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`,
            { timeout: 20000 }
        )
        return res.data?.video?.noWatermark || null
    } catch (e) { return null }
}

// Unsplash image search
async function searchImage(query, key) {
    try {
        const res = await axios.get('https://api.unsplash.com/search/photos', {
            params: { query, per_page: 1 },
            headers: { Authorization: `Client-ID ${key}` }
        })
        const results = res.data.results
        if (!results?.length) return null
        return results[0].urls.regular
    } catch (e) {
        return `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`
    }
}

// Upscale image
async function upscale(buffer) {
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
        const img = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 })
        return Buffer.from(img.data)
    } catch (e) { return null }
}

module.exports = {
    askAI,
    wiki,
    weather,
    joke,
    funfact,
    advice,
    quote,
    meme,
    tiktok,
    searchImage,
    upscale
}
