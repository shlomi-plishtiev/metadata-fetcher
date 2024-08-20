import express from 'express'
import axios from 'axios'
import cors from 'cors'
import rateLimit from 'express-rate-limit'

const app = express()

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}))

app.use(express.json())

const limiter = rateLimit({
  windowMs: 1000,
  max: 5,
  message: 'Too many requests, please try again later.',
})

app.use(limiter)

app.post('/fetch-metadata', async (req, res) => {
  const urls = req.body.urls

  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of URLs' })
  }
  // מביא מטא נתונים
  async function fetchMetadata(url) {
    try {
      const response = await axios.get(url)
      const html = response.data

      const titleMatch = html.match(/<title>(.*?)<\/title>/)
      const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/)
      const descriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/)
      const ogDescriptionMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/)
      const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/)

      const title = ogTitleMatch ? ogTitleMatch[1] : titleMatch ? titleMatch[1] : ''
      const description = ogDescriptionMatch ? ogDescriptionMatch[1] : descriptionMatch ? descriptionMatch[1] : ''
      const image = imageMatch ? imageMatch[1] : ''

      return { url, title, description, image }
    } catch (error) {
      return { url, error: 'Could not retrieve metadata' }
    }
  }

  const metadataPromises = urls.map(fetchMetadata)
  const metadataResults = await Promise.all(metadataPromises)

  res.json(metadataResults)
})

const port = process.env.PORT || 3000
app.listen(port, () =>
    console.log(`Server listening on port http://127.0.0.1:${port}/`)
)
