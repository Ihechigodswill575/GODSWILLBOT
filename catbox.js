// ======= CATBOX FILE HOSTING =======
const axios = require('axios')
const FormData = require('form-data')

async function upload(buffer, filename = 'file.jpg', mimetype = 'image/jpeg') {
    try {
        const form = new FormData()
        form.append('reqtype', 'fileupload')
        form.append('fileToUpload', buffer, {
            filename,
            contentType: mimetype
        })

        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 30000
        })

        return res.data?.trim() || null
    } catch (e) {
        console.log('Catbox error:', e.message)
        return null
    }
}

async function uploadFromUrl(url) {
    try {
        const form = new FormData()
        form.append('reqtype', 'urlupload')
        form.append('url', url)

        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders(),
            timeout: 30000
        })

        return res.data?.trim() || null
    } catch (e) {
        return null
    }
}

module.exports = { upload, uploadFromUrl }
