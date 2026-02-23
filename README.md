# Otakudesu Scraper API

Node.js API Scraper for otakudesu.fit with security features and clean architecture.

## Features

- ✅ **Rotating User-Agent** - 10+ different browser user agents
- ✅ **Random Delay** - 1-3 seconds between requests
- ✅ **Axios Retry** - Automatic retry with exponential backoff
- ✅ **Proxy Support** - Optional proxy configuration
- ✅ **AES Encryption** - AES-256 encrypted responses
- ✅ **Helmet Security** - Comprehensive HTTP headers security
- ✅ **Rate Limiting** - Configurable request rate limiting
- ✅ **Environment Config** - dotenv configuration
- ✅ **Request Logging** - Morgan HTTP request logger
- ✅ **Clean Architecture** - Separated concerns (routes, controllers, services, utils)

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` with your settings:
```env
PORT=3000
NODE_ENV=development

# Response Format (set 'true' for encrypted responses)
USE_ENCRYPTION=false

# Encryption Key (required if USE_ENCRYPTION=true, must be 32 characters)
ENCRYPTION_KEY=your-secret-key-32-chars-long!!!

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Proxy (optional)
PROXY_ENABLED=false
PROXY_HOST=
PROXY_PORT=

# Scraper
REQUEST_TIMEOUT=30000
MAX_RETRIES=3
RETRY_DELAY=1000
```

**Note:** Set `USE_ENCRYPTION=false` untuk response JSON plain (mudah dipakai).

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/ongoing` | Get ongoing anime list |
| GET | `/api/completed` | Get completed anime list |
| GET | `/api/series?page=1` | Get all anime series (with pagination) |
| GET | `/api/search?q=naruto` | Search anime |
| GET | `/api/anime/:id` | Get anime details by ID |
| GET | `/api/nonton/:slug` | Get episode streaming URL (iframe) |

## Example Requests

### Get Ongoing Anime
```bash
curl http://localhost:3000/api/ongoing
```

### Search Anime
```bash
curl "http://localhost:3000/api/search?q=one+piece"
```

### Get Anime Details by ID
```bash
curl http://localhost:3000/api/anime/chou-kaguya-hime
curl http://localhost:3000/api/anime/medalist-2nd-season
```

### Get Series List (with pagination)
```bash
curl "http://localhost:3000/api/series?page=1"
curl "http://localhost:3000/api/series?page=2"
```

### Get Episode Stream URL
```bash
# Get slug from anime detail episodes array
curl http://localhost:3000/api/nonton/medalist-2nd-season-episode-5-subtitle-indonesia
curl http://localhost:3000/api/nonton/chou-kaguya-hime-episode-1-subtitle-indonesia
```

## Response Format

### Plain JSON (default, USE_ENCRYPTION=false)

**Nonton/Stream Endpoint:**
```json
{
  "success": true,
  "timestamp": "2026-02-23T17:58:20.498Z",
  "id": "medalist-2nd-season-episode-5-subtitle-indonesia",
  "title": "Medalist 2nd Season Episode 5 Subtitle Indonesia",
  "iframeUrl": "https://www.blogger.com/video.g?token=...",
  "downloadLinks": []
}
```

**Series Endpoint:**
```json
{
  "success": true,
  "timestamp": "2026-02-23T17:29:53.929Z",
  "series": [
    {
      "id": "chou-kaguya-hime",
      "title": "Chou Kaguya-hime!",
      "url": "https://otakudesu.fit/chou-kaguya-hime/",
      "thumbnail": "https://i2.wp.com/...",
      "year": null,
      "episode": "EP1"
    }
  ],
  "pagination": {
    "current": 1,
    "next": "https://otakudesu.fit/series/page/2/",
    "prev": null,
    "pages": [
      {"number": 2, "url": "https://otakudesu.fit/series/page/2/"},
      {"number": 3, "url": "https://otakudesu.fit/series/page/3/"}
    ]
  },
  "count": 10
}
```

**Other Endpoints:**
```json
{
  "success": true,
  "timestamp": "2026-02-23T17:22:34.982Z",
  "animes": [...],
  "count": 20
}
```

### Encrypted (USE_ENCRYPTION=true)
All responses are AES-256 encrypted:

```json
{
  "encrypted": true,
  "payload": "U2FsdGVkX1+..."
}
```

### Decrypt Response (Node.js)
```javascript
const CryptoJS = require('crypto-js');

function decrypt(encryptedData, key) {
  const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
}

const response = await fetch('http://localhost:3000/api/ongoing');
const data = await response.json();
const decrypted = decrypt(data.payload, 'your-32-character-secret-key-here');
```

## Project Structure

```
animw/
├── src/
│   ├── app.js              # Express app configuration
│   ├── server.js           # Server entry point
│   ├── controllers/
│   │   └── scraperController.js
│   ├── routes/
│   │   └── api.js
│   ├── services/
│   │   └── scraperService.js
│   └── utils/
│       ├── delay.js
│       ├── encryption.js
│       ├── logger.js
│       ├── proxy.js
│       └── userAgent.js
├── logs/                   # Auto-generated log files
├── .env.example
├── .gitignore
└── package.json
```

## Security Features

- **Helmet**: Sets secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
- **Rate Limiting**: Prevents abuse (default: 100 requests/15 min)
- **AES Encryption**: Optional AES-256 encrypted responses (configurable)
- **Input Validation**: Query parameter validation
- **Error Handling**: Secure error messages in production

## License

ISC
