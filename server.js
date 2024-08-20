import express from 'express';
import axios from 'axios';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();

// הגדרת אפשרויות CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};

// יישום אמצעי CORS
app.use(cors(corsOptions));

// הגשת קבצים סטטיים בסביבת ייצור
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('public'));
}

// middleware לפרסור גופי בקשות JSON
app.use(express.json());

// middleware להגבלת בקשות
const limiter = rateLimit({
  windowMs: 1000, // 1 שניה
  max: 5, // מגביל כל IP ל-5 בקשות לכל חלון זמן
  message: 'Too many requests, please try again later.',
});

app.use(limiter);

// נקודת קצה לקבלת מטא נתונים
app.post('/fetch-metadata', async (req, res) => {
  const urls = req.body.urls;

  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of URLs' });
  }

  // פונקציה להביא מטא נתונים מכתובת URL
  async function fetchMetadata(url) {
    try {
      const response = await axios.get(url);
      const html = response.data;

      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/);
      const descriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/);
      const ogDescriptionMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/);
      const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/);

      const title = ogTitleMatch ? ogTitleMatch[1] : titleMatch ? titleMatch[1] : '';
      const description = ogDescriptionMatch ? ogDescriptionMatch[1] : descriptionMatch ? descriptionMatch[1] : '';
      const image = imageMatch ? imageMatch[1] : '';

      return { url, title, description, image };
    } catch (error) {
      return { url, error: 'Could not retrieve metadata' };
    }
  }

  const metadataPromises = urls.map(fetchMetadata);
  const metadataResults = await Promise.all(metadataPromises);

  res.json(metadataResults);
});

// הפעלת השרת
const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`Server listening on port http://127.0.0.1:${port}/`)
);
