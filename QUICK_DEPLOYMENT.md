# Smart Meeting Assistant - Quick Deployment Checklist

## 🚀 Quick Start (60 Minutes)

### **Step 1: Pre-Deployment (15 min)**

- [ ] Create `.env` file in backend (copy from `.env.example`)
- [ ] Create `.env` file in frontend (set `VITE_API_URL`)
- [ ] Generate JWT secrets: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Obtain all API keys (Google, Gemini, transcription services)
- [ ] Setup MongoDB Atlas cluster and get connection string

### **Step 2: Build (15 min)**

```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
npm run build
```

### **Step 3: Deploy Backend (15 min)**

**Railway.app** (Easiest):

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

**OR Heroku:**

```bash
echo "web: node server.js" > Procfile
heroku login
heroku create your-app-name
git push heroku main
```

### **Step 4: Deploy Frontend (15 min)**

**Vercel** (Recommended):

```bash
npm install -g vercel
cd frontend
vercel --prod
```

**OR Netlify:**

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

---

## 📋 Complete Environment Variables

### **Backend `.env` Required Fields**

```
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/smart-meeting-assistant

# Secrets (MUST generate)
JWT_SECRET=<random-32-char-hex>
JWT_REFRESH_SECRET=<random-32-char-hex>

# Google OAuth
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback

# AI/Transcription
GEMINI_API_KEY=<your-key>
ASSEMBLYAI_API_KEY=<your-key>
DEEPGRAM_API_KEY=<your-key>
HF_TOKEN=<your-token>

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=<app-password>
FRONTEND_URL=https://yourdomain.com

# File Paths
UPLOADS_PATH=./uploads
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
```

### **Frontend `.env`**

```
VITE_API_URL=https://yourdomain.com/api
```

---

## 🔧 Technology Stack Summary

| Layer                  | Technology                | Version | Status              |
| ---------------------- | ------------------------- | ------- | ------------------- |
| **Frontend**           | React                     | 19.2.0  | ✅ Production Ready |
| **Frontend Build**     | Vite                      | 7.2.4   | ✅                  |
| **Styling**            | Tailwind CSS              | 3.4.15  | ✅                  |
| **Backend**            | Node.js/Express           | 5.2.1   | ✅                  |
| **Database**           | MongoDB                   | 9.0.2   | ✅                  |
| **Real-time**          | Socket.io                 | 4.8.1   | ✅                  |
| **Auth**               | JWT + Cookies             | -       | ✅                  |
| **AI**                 | Gemini API                | 1.33.0  | ✅                  |
| **Transcription**      | Whisper/Assembly/Deepgram | -       | ✅                  |
| **Email**              | Nodemailer                | 7.0.11  | ✅                  |
| **Google Integration** | googleapis                | 169.0.0 | ✅                  |

---

## 🏗️ Hosting Recommendations

### **Backend** (Choose One)

1. **Railway.app** ⭐ (Simplest, free tier available)
2. **Vercel** (Node.js compatible)
3. **Heroku** (Easy but paid)
4. **DigitalOcean/AWS EC2** (Full control)
5. **Fly.io** (Good scaling)

### **Frontend** (Choose One)

1. **Vercel** ⭐ (Optimal for React/Vite)
2. **Netlify** (Good alternative)
3. **AWS S3 + CloudFront** (For scale)

### **Database** (Choose One)

1. **MongoDB Atlas** ⭐ (Managed, free tier, recommended)
2. **AWS DocumentDB**
3. **Self-hosted MongoDB**

---

## ✅ Post-Deployment Validation

### **Test Backend Connectivity**

```bash
# 1. Health check
curl https://yourdomain.com/api/health

# 2. Check logs
# Railway: Railway dashboard
# Heroku: heroku logs --tail

# 3. Verify MongoDB connected
# Check logs for: "MongoDB Connected Successfully"
```

### **Test Frontend Connectivity**

```bash
# 1. Open browser: https://yourdomain.com
# 2. Check DevTools → Network tab
# 3. Verify API calls go to: https://yourdomain.com/api/
# 4. Check DevTools → Console
# 5. Should see: "[socket.io] connected"
```

### **Test User Features**

- [ ] Can register new user
- [ ] Can login
- [ ] Can create meeting
- [ ] Can upload/record audio
- [ ] Can view transcripts
- [ ] Can generate summary
- [ ] Can export as PDF
- [ ] Google OAuth login works
- [ ] Email notifications sent

---

## 🔒 Security Verification

- [ ] HTTPS enabled (green lock in browser)
- [ ] `NODE_ENV=production`
- [ ] All secrets in environment variables (not in code)
- [ ] CORS restricted to your domain
- [ ] Rate limiting active
- [ ] MongoDB authentication enabled
- [ ] Helmet security headers enabled
- [ ] Password inputs marked HttpOnly
- [ ] No sensitive data in logs

---

## 📊 Monitoring Setup

### **Essential Monitoring**

- Set up uptime monitoring (Pingdom, UptimeRobot)
- Monitor error rates (Sentry, LogRocket)
- Monitor performance (New Relic, DataDog)
- Setup alerts for failures

### **Manual Checks**

- Check logs daily
- Monitor disk space
- Monitor CPU/Memory
- Check database size

---

## 🐛 Common Issues & Quick Fixes

| Issue                         | Solution                                                    |
| ----------------------------- | ----------------------------------------------------------- |
| **MongoDB connection fails**  | Check `.env` URI, IP whitelist, password                    |
| **CORS errors**               | Update backend CORS origin to your domain                   |
| **Google OAuth fails**        | Verify redirect URI in Google Console                       |
| **Email not sending**         | Use App Password for Gmail, not regular password            |
| **Socket.io not connecting**  | Check proxy settings, CORS for WebSocket                    |
| **Transcription not working** | Verify FFmpeg installed, Python dependencies met            |
| **Upload fails**              | Check `UPLOADS_PATH` directory exists, disk space available |
| **404 on API calls**          | Verify `VITE_API_URL` matches backend domain                |

---

## 📈 Scaling Tips (When Needed)

1. **Database**: Enable MongoDB Atlas Auto-scaling
2. **Backend**: Use PM2 Cluster mode or multiple containers
3. **Frontend**: Enable CDN caching
4. **Transcription**: Move to separate worker service
5. **Caching**: Add Redis for sessions
6. **API**: Add API Gateway rate limiting

---

## 🔗 Useful Links

- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Railway.app Documentation](https://docs.railway.app)
- [Vercel Deployment](https://vercel.com/docs)
- [Express.js Guide](https://expressjs.com)
- [React Documentation](https://react.dev)
- [Socket.io Documentation](https://socket.io/docs)

---

## 📞 Support Contacts

- **MongoDB**: support@mongodb.com
- **Railway**: Discord support
- **Vercel**: Support portal
- **Google Cloud**: Cloud Support

---

**Last Updated**: April 26, 2026  
**Estimated Deployment Time**: 1-2 hours  
**Difficulty Level**: Intermediate ⭐⭐⭐
