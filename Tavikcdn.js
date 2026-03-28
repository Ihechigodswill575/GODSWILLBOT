// ======= TAVIK CDN - Media Upload & Hosting =======
const axios = require('axios')
const FormData = require('form-data')

// Upload image to CDN and get URL
async function uploadToCDN(buffer, filename = 'tavik.jpg') {
    try {
        const form = new FormData()
        form.append('file', buffer, {
            filename: filename,
            contentType: 'image/jpeg'
        })

        // Using catbox.moe free CDN
        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: {
                ...form.getHeaders(),
                'reqtype': 'fileupload'
            },
            timeout: 30000
        })

        return res.data || null
    } catch (e) {
        console.log('CDN upload error:', e.message)
        return null
    }
}

// Upload video to CDN
async function uploadVideoToCDN(buffer, filename = 'tavik.mp4') {
    try {
        const form = new FormData()
        form.append('reqtype', 'fileupload')
        form.append('fileToUpload', buffer, {
            filename: filename,
            contentType: 'video/mp4'
        })

        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 60000
        })

        return res.data || null
    } catch (e) {
        console.log('Video CDN error:', e.message)
        return null
    }
}

// Get image from URL as buffer
async function getBuffer(url) {
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })
        return Buffer.from(res.data)
    } catch (e) {
        return null
    }
}

module.exports = {
    uploadToCDN,
    uploadVideoToCDN,
    getBuffer
}
