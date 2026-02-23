# Vercel Deployment Guide

## Fix 500 Error

Jika mendapatkan error `500: INTERNAL_SERVER_ERROR` atau `FUNCTION_INVOCATION_FAILED`:

### 1. Check Environment Variables

Pastikan semua environment variables berikut sudah di-set di Vercel Dashboard:

```bash
ENCRYPTION_KEY=your-secret-key-32-chars-long!!!
USE_ENCRYPTION=false
NODE_ENV=production
```

### 2. Redeploy

```bash
vercel --prod
```

### 3. Check Logs

Di Vercel Dashboard:
1. Go to your project
2. Click "Deployments"
3. Click the latest deployment
4. Click "View Logs" atau "Function Logs"

### Common Issues

#### Issue: Cannot find module
**Solution**: Pastikan semua dependencies ada di package.json
```bash
npm install
git push
```

#### Issue: ENOENT: no such file or directory, mkdir 'logs'
**Solution**: Logger sudah diupdate untuk tidak membuat folder logs di serverless

#### Issue: Timeout
**Solution**: Increase function timeout di vercel.json (max 10s untuk free tier)

#### Issue: Encryption key length
**Solution**: Pastikan ENCRYPTION_KEY exactly 32 characters

## Test Deployment

```bash
# Get your Vercel URL
VERCEL_URL=https://your-project.vercel.app

# Test endpoints
curl $VERCEL_URL/api/health
curl $VERCEL_URL/api/ongoing
curl $VERCEL_URL/api/anime/medalist-2nd-season
```

## Environment Variables di Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Add variables:
   - `ENCRYPTION_KEY` (32 characters)
   - `USE_ENCRYPTION` = false
   - `NODE_ENV` = production
5. Redeploy

## Deployment Checklist

- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Login: `vercel login`
- [ ] Set environment variables
- [ ] Deploy: `vercel --prod`
- [ ] Test health endpoint
- [ ] Test other endpoints
