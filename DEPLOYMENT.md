# Deploy Otakudesu Scraper API to Vercel

## Prerequisites
- Node.js 18+ installed
- Vercel account (free tier available)
- Vercel CLI installed: `npm install -g vercel`

## Quick Deploy

### 1. Clone & Install
```bash
cd animw
npm install
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy to Vercel
```bash
vercel --prod
```

### 4. Set Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add the following variables:

```
ENCRYPTION_KEY=your-secret-key-32-chars-long!!!
USE_ENCRYPTION=false
PORT=3000
NODE_ENV=production
```

### 5. Redeploy
```bash
vercel --prod
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENCRYPTION_KEY` | Conditional | - | 32-character key (required if USE_ENCRYPTION=true) |
| `USE_ENCRYPTION` | No | false | Enable AES-256 encryption |
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | production | Environment |
| `RATE_LIMIT_WINDOW_MS` | No | 900000 | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | 100 | Max requests per window |
| `REQUEST_TIMEOUT` | No | 30000 | Request timeout (ms) |
| `MAX_RETRIES` | No | 3 | Max retry attempts |

## Testing Locally Before Deploy

```bash
# Development
npm run dev

# Production simulation
npm start
```

## Vercel Dashboard

After deployment, you can:
- View deployment logs
- Set environment variables
- Configure domains
- Monitor usage
- Set up automatic deployments from Git

## Automatic Deployments

Connect your Git repository to Vercel for automatic deployments:

1. Push code to GitHub/GitLab/Bitbucket
2. Import project in Vercel Dashboard
3. Every push to main branch will auto-deploy

## Usage Example

```bash
# Your Vercel URL
VERCEL_URL=https://your-project.vercel.app

# Test endpoints
curl $VERCEL_URL/api/health
curl $VERCEL_URL/api/ongoing
curl $VERCEL_URL/api/anime/medalist-2nd-season
curl $VERCEL_URL/api/nonton/medalist-2nd-season-episode-5-subtitle-indonesia
```

## Troubleshooting

### Build Fails
- Check Node.js version (must be >= 18)
- Run `npm install` locally first
- Check vercel.json configuration

### Runtime Errors
- Check environment variables are set
- Review deployment logs in Vercel Dashboard
- Test locally with `npm start`

### Rate Limiting
- Adjust RATE_LIMIT_MAX_REQUESTS if needed
- Vercel has its own rate limits on free tier

## Vercel Free Tier Limits

- 100GB bandwidth/month
- 100GB serverless function execution
- Unlimited deployments
- Automatic SSL

## Production Tips

1. **Use Environment Variables**: Never commit `.env` files
2. **Enable Encryption**: Set `USE_ENCRYPTION=true` for production
3. **Monitor Usage**: Check Vercel Dashboard regularly
4. **Custom Domain**: Add custom domain in Vercel Dashboard
5. **Analytics**: Enable Vercel Analytics for insights
