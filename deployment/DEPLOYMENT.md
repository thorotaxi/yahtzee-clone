# Yahtzee Clone - Deployment Guide

## 🚀 Deployment Overview

This guide covers deploying the Yahtzee Clone to Vercel (frontend) and Railway (backend).

## 📁 Project Structure for Deployment

```
yahtzee-clone/
├── src/                    # Frontend (React/TypeScript) - Deploy to Vercel
├── server/                 # Backend (Node.js/Express) - Deploy to Railway
├── package.json            # Frontend dependencies
├── server/package.json     # Backend dependencies
├── env.example            # Environment variables template
└── DEPLOYMENT.md          # This file
```

## 🎯 Frontend Deployment (Vercel)

### Prerequisites
- Vercel account
- GitHub repository with the project

### Steps

1. **Prepare Frontend for Deployment**
   ```bash
   # Build the frontend
   npm run build
   ```

2. **Deploy to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Configure settings:
     - **Framework Preset**: Vite
     - **Root Directory**: `./` (root of repository)
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`

3. **Environment Variables**
   Add these in Vercel dashboard:
   ```
   VITE_API_URL=https://your-railway-app.railway.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your frontend

## 🔧 Backend Deployment (Railway)

### Prerequisites
- Railway account
- GitHub repository with the project

### Steps

1. **Prepare Backend for Deployment**
   ```bash
   cd server
   npm install --production
   ```

2. **Deploy to Railway**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Configure settings:
     - **Root Directory**: `server`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`

3. **Environment Variables**
   Add these in Railway dashboard:
   ```
   NODE_ENV=production
   PORT=3001
   CORS_ORIGINS=https://your-vercel-app.vercel.app
   LOG_LEVEL=info
   ENABLE_DEBUG_LOGS=false
   ```

4. **Deploy**
   - Railway will automatically deploy your backend
   - Note the generated URL (e.g., `https://your-app.railway.app`)

## 🔗 Connecting Frontend and Backend

1. **Update Frontend API URL**
   - In Vercel dashboard, update `VITE_API_URL` to your Railway backend URL
   - Redeploy the frontend

2. **Update Backend CORS**
   - In Railway dashboard, update `CORS_ORIGINS` to include your Vercel frontend URL
   - Redeploy the backend

## 📝 Environment Variables Reference

### Frontend (Vercel)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://your-app.railway.app` |

### Backend (Railway)
| Variable | Description | Default | Production |
|----------|-------------|---------|------------|
| `NODE_ENV` | Environment mode | `development` | `production` |
| `PORT` | Server port | `3001` | `3001` |
| `CORS_ORIGINS` | Allowed origins | `localhost:5173` | `https://your-app.vercel.app` |
| `LOG_LEVEL` | Logging level | `info` | `info` |
| `ENABLE_DEBUG_LOGS` | Enable debug logs | `false` | `false` |
| `DB_PATH` | Database file path | `./yahtzee_remote.db` | `./yahtzee_remote.db` |

## 🔍 Post-Deployment Verification

### Frontend Checks
- [ ] App loads without errors
- [ ] Local game mode works
- [ ] Remote game creation works
- [ ] Invite links are generated correctly

### Backend Checks
- [ ] Health check endpoint responds: `https://your-app.railway.app/health`
- [ ] API endpoints are accessible
- [ ] Database operations work
- [ ] CORS is configured correctly

### Integration Checks
- [ ] Frontend can connect to backend
- [ ] Remote games can be created and joined
- [ ] Real-time updates work
- [ ] Game state persists correctly

## 🛠️ Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `CORS_ORIGINS` includes your frontend URL
   - Check that URLs match exactly (including protocol)

2. **Database Issues**
   - Railway provides persistent storage
   - Database file will be created automatically

3. **Build Failures**
   - Check build logs in deployment platform
   - Ensure all dependencies are in `package.json`

4. **API Connection Issues**
   - Verify `VITE_API_URL` is correct
   - Check that backend is running and accessible

### Debug Mode
To enable debug logging temporarily:
1. Set `ENABLE_DEBUG_LOGS=true` in Railway
2. Set `LOG_LEVEL=debug` in Railway
3. Redeploy backend
4. Check logs in Railway dashboard

## 📊 Monitoring

### Vercel Monitoring
- View deployment status in Vercel dashboard
- Check function logs for errors
- Monitor performance metrics

### Railway Monitoring
- View deployment logs in Railway dashboard
- Monitor resource usage
- Check application logs

## 🔄 Updates and Maintenance

### Frontend Updates
1. Push changes to GitHub
2. Vercel will automatically redeploy
3. Verify changes are live

### Backend Updates
1. Push changes to GitHub
2. Railway will automatically redeploy
3. Check logs for any issues

### Database Migrations
- Database schema changes require manual intervention
- Backup database before major changes
- Test migrations in development first

## 🎉 Success!

Once deployed, your Yahtzee Clone will be available at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-app.railway.app`

Players can create games, share invite links, and enjoy multiplayer Yahtzee!

## 📞 Support

For deployment issues:
1. Check platform-specific documentation
2. Review logs in deployment dashboard
3. Verify environment variables
4. Test locally before deploying
