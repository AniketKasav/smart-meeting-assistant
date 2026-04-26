# Smart Meeting Assistant - Deployment Plan

## 📋 Project Overview

This is a **full-stack web application** for intelligent meeting management with:

- **Frontend**: React + Vite (runs on port 5173)
- **Backend**: Node.js/Express + MongoDB (runs on port 4000)
- **Python Services**: Transcription, diarization, AI processing
- **External Services**: Google OAuth, Gemini AI, Email, Transcription APIs

---

## 🔍 Current Architecture

### **Backend Stack**

- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.2.1
- **Database**: MongoDB (Atlas or self-hosted)
- **Real-time**: Socket.io 4.8.1
- **Authentication**: JWT + Cookies
- **Key Libraries**:
  - Google APIs (Gmail, Drive integration)
  - Mongoose (MongoDB ODM)
  - Multer (file uploads)
  - FFmpeg (audio processing)
  - Nodemailer (email)
  - Rate limiting, Helmet (security)

### **Frontend Stack**

- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.4
- **Styling**: Tailwind CSS + PostCSS
- **Routing**: React Router v7
- **State**: Axios + Socket.io client
- **Charts**: Recharts

### **Python Services**

- **Transcription**: Faster-Whisper, OpenAI-Whisper
- **Requirements**: torch, numpy<2.0.0

### **External Integrations**

1. **Google OAuth** (Gmail, Drive, Google Meet)
2. **AI Models**: Gemini API, Ollama (local)
3. **Transcription APIs**: Assembly AI, Deepgram, Vosk
4. **Email**: Gmail/Outlook SMTP
5. **Cloud Storage**: Google Drive

---

## 📦 Environment Variables Checklist

### **Backend (.env)**

```
# Server
PORT=4000
NODE_ENV=production

# Database
MONGODB_URI=<your-mongodb-connection-string>

# File Paths
UPLOADS_PATH=./uploads
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe

# AI & Transcription
GEMINI_API_KEY=<your-gemini-key>
HF_TOKEN=<huggingface-token>
ASSEMBLYAI_API_KEY=<assembly-ai-key>
DEEPGRAM_API_KEY=<deepgram-key>

# JWT Secrets (GENERATE STRONG RANDOM STRINGS)
JWT_SECRET=<generate-random-string>
JWT_REFRESH_SECRET=<generate-random-string>

# Email Configuration
EMAIL_SERVICE=gmail  # or smtp
EMAIL_USER=<your-email@gmail.com>
EMAIL_PASSWORD=<app-password>
FRONTEND_URL=https://yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

### **Frontend (.env)**

```
VITE_API_URL=https://yourdomain.com/api
```

---

## 🚀 Deployment Steps

### **Phase 1: Pre-Deployment Setup**

#### 1.1 Choose Hosting Platform

**Recommended Options:**

- **Backend**: Heroku, Railway, Fly.io, AWS EC2, DigitalOcean, Render
- **Frontend**: Vercel, Netlify, AWS S3+CloudFront, Azure Static Web Apps
- **Database**: MongoDB Atlas (cloud), AWS DocumentDB, or self-hosted
- **Python Services**: Same server as Node.js OR separate microservice (Lambda, Cloud Functions)

#### 1.2 Obtain Required API Keys & Credentials

- [ ] **Google OAuth Console**
  - Create OAuth 2.0 credentials
  - Set authorized redirect URIs
  - Get Client ID & Secret
- [ ] **MongoDB Atlas**
  - Create cluster
  - Add IP whitelist
  - Generate connection string
- [ ] **Gemini API** (Google AI)
  - Enable API in Google Cloud Console
  - Generate API key
- [ ] **Email Service** (Gmail App Password OR SendGrid)
  - Gmail: Generate app-specific password
  - Or use other SMTP service
- [ ] **Transcription APIs** (Optional - Choose ONE or MORE)
  - Assembly AI key
  - Deepgram API key
  - Or use local Vosk/Whisper
- [ ] **HuggingFace Token** (for model access)

#### 1.3 Generate Security Secrets

```bash
# Generate random JWT secrets (run in terminal)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### **Phase 2: Database Setup**

#### 2.1 MongoDB Atlas Setup (Recommended)

1. Create MongoDB Atlas account
2. Create a database cluster (free tier available)
3. Create database user with strong password
4. Whitelist your deployment IP(s)
5. Get connection string: `mongodb+srv://user:password@cluster.mongodb.net/smart-meeting-assistant`
6. Create required indexes:

```javascript
// Transcript collection
db.transcripts.createIndex({ meetingId: 1, processingStatus: 1 });
db.transcripts.createIndex({ fullText: "text" });

// User collection
db.users.createIndex({ email: 1 }, { unique: true });

// Meetings collection
db.meetings.createIndex({ userId: 1, createdAt: -1 });
```

#### 2.2 Alternative: Self-Hosted MongoDB

```bash
# Docker MongoDB (if using Docker)
docker run -d \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -v mongodb_data:/data/db \
  mongo:7.0
```

---

### **Phase 3: Backend Deployment**

#### 3.1 Prepare Backend for Production

**Step 1: Clean up dependencies**

```bash
cd backend
npm install
npm audit
# Fix any security vulnerabilities
npm audit fix
```

**Step 2: Create production `.env` file**

- Copy from `.env.example`
- Fill in all required credentials
- Ensure `NODE_ENV=production`
- Use strong secrets for JWT

**Step 3: Install system dependencies** (if using transcription)

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install ffmpeg python3-pip python3-venv

# Install Python dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Step 4: Test locally**

```bash
npm run dev  # Should start on port 4000
# Test health: curl http://localhost:4000/api/health
```

#### 3.2 Deploy Backend to Hosting Platform

**Option A: Railway.app (Simplest)**

```bash
# 1. Install railway CLI
npm install -g @railway/cli

# 2. Login and initialize
railway login
railway init

# 3. Deploy
railway up
# Note: Railway auto-detects Node.js and starts npm start
```

**Option B: Heroku (Traditional)**

```bash
# 1. Create Procfile in backend root:
echo "web: node server.js" > Procfile

# 2. Deploy
heroku login
heroku create your-app-name
git push heroku main
heroku config:set NODE_ENV=production
# Set env vars via Heroku dashboard
```

**Option C: DigitalOcean/AWS EC2 (Full Control)**

```bash
# 1. SSH into server
ssh root@your_server_ip

# 2. Setup Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clone and setup
git clone https://github.com/yourusername/smart-meeting-assistant.git
cd smart-meeting-assistant/backend
npm install

# 4. Create systemd service
sudo nano /etc/systemd/system/meeting-assistant.service
```

**systemd service file:**

```ini
[Unit]
Description=Smart Meeting Assistant Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/www-data/smart-meeting-assistant/backend
ExecStart=/usr/bin/node server.js
Restart=always
Environment="NODE_ENV=production"
EnvironmentFile=/home/www-data/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable meeting-assistant
sudo systemctl start meeting-assistant
```

#### 3.3 Backend Post-Deployment Verification

```bash
# Test health endpoint
curl https://yourdomain.com/api/health

# Check logs
pm2 logs  # if using PM2
# or
journalctl -u meeting-assistant -f  # systemd

# Test MongoDB connection
# Check backend logs for "MongoDB Connected Successfully"
```

---

### **Phase 4: Frontend Deployment**

#### 4.1 Build Frontend for Production

```bash
cd frontend
npm install
npm run build
# Output: dist/ folder ready for deployment
```

#### 4.2 Frontend Deployment Options

**Option A: Vercel (Recommended for React)**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy from frontend directory
cd frontend
vercel --prod

# 3. Configure environment during deployment
# Set VITE_API_URL=https://yourdomain.com/api
```

**Option B: Netlify**

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Deploy
cd frontend
netlify deploy --prod --dir=dist

# 3. Set build settings in netlify.toml
echo '[build]
command = "npm run build"
publish = "dist"

[[redirects]]
from = "/api/*"
to = "https://yourdomain.com/api/:splat"
status = 200' > netlify.toml
```

**Option C: AWS S3 + CloudFront**

```bash
# 1. Build
npm run build

# 2. Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

**Option D: Same Server as Backend (Docker)**

```bash
# Create Dockerfile in root
echo 'FROM node:20-alpine
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]' > Dockerfile
```

#### 4.3 Update Frontend Environment

- Update `VITE_API_URL` to point to deployed backend
- Rebuild: `npm run build`
- Redeploy dist folder

---

### **Phase 5: Domain & SSL Setup**

#### 5.1 Domain Configuration

1. Register domain (GoDaddy, Namecheap, Google Domains, etc.)
2. Point DNS to your hosting:
   - **Vercel/Netlify**: Add CNAME records shown in deployment
   - **Custom server**: Point A record to server IP
3. SSL Certificate:
   - **Vercel/Netlify**: Auto SSL via Let's Encrypt
   - **Custom server**: `sudo certbot certonly -d yourdomain.com`

#### 5.2 Configure Backend for HTTPS

```javascript
// Update server.js or use reverse proxy (Nginx)
const https = require("https");
const fs = require("fs");

const options = {
  key: fs.readFileSync("/etc/letsencrypt/live/yourdomain.com/privkey.pem"),
  cert: fs.readFileSync("/etc/letsencrypt/live/yourdomain.com/fullchain.pem"),
};

https.createServer(options, app).listen(443);
```

OR use **Nginx reverse proxy** (Recommended):

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

### **Phase 6: Google OAuth Configuration**

#### 6.1 Setup OAuth Redirect

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to **Credentials** → **OAuth 2.0 Client IDs**
4. Update **Authorized redirect URIs**:
   ```
   https://yourdomain.com/api/auth/google/callback
   https://yourdomain.com/oauth/google/callback
   ```
5. Copy Client ID and Secret to backend `.env`

#### 6.2 Enable Required APIs

- Gmail API
- Google Drive API
- Google Meet API (if needed)

---

### **Phase 7: Testing & Validation**

#### 7.1 Backend Tests

```bash
# 1. Health check
curl https://yourdomain.com/api/health

# 2. Test authentication
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test"}'

# 3. Test MongoDB connection
# Check logs: should see "MongoDB Connected Successfully"

# 4. Test email service
# Trigger password reset and verify email is sent

# 5. Test Google OAuth
# Try login with Google account
```

#### 7.2 Frontend Tests

```bash
# 1. Load application
# https://yourdomain.com should load React app

# 2. Check API connectivity
# Open browser DevTools → Network tab
# Verify API calls go to https://yourdomain.com/api/

# 3. Test Socket.io connection
# DevTools → Console should show: "[socket.io] connected"

# 4. Test features
# - User registration/login
# - Create meeting
# - Upload audio
# - View transcripts
```

#### 7.3 Security Audit

```bash
# 1. Check CORS settings
# Verify only allowed origins can access API

# 2. Check JWT tokens
# Verify tokens are HttpOnly + Secure cookies

# 3. Check password hashing
# Passwords should be bcrypt hashed in DB

# 4. Check rate limiting
# Try multiple requests, verify 429 status

# 5. Run security scan
npm audit
npm run lint
```

---

## 🔒 Security Checklist

- [ ] `NODE_ENV=production` in backend
- [ ] All secrets (JWT, API keys) in environment variables
- [ ] HTTPS/SSL enabled
- [ ] MongoDB authentication enabled
- [ ] CORS configured to specific origins only
- [ ] Rate limiting enabled
- [ ] Helmet security headers enabled
- [ ] Input validation enabled
- [ ] SQL/NoSQL injection prevention verified
- [ ] CSRF tokens if applicable
- [ ] Password requirements enforced (bcrypt hashing)
- [ ] API rate limits configured
- [ ] Sensitive logs not exposed
- [ ] File uploads validated (type, size)

---

## 📊 Monitoring & Maintenance

### 7.1 Logging

- Use cloud logging (Vercel, Railway, AWS CloudWatch)
- Monitor error rates and patterns
- Alert on critical errors

### 7.2 Performance Monitoring

- Monitor response times
- Track database query performance
- Monitor file upload/transcription times
- Setup uptime monitoring (StatusPage, Pingdom)

### 7.3 Backup & Recovery

```bash
# MongoDB Atlas auto-backups are enabled
# Manual backup:
mongodump --uri "mongodb+srv://user:pass@cluster..." --out ./backup

# Restore:
mongorestore ./backup
```

### 7.4 Updates & Dependencies

```bash
# Monthly security audits
npm audit
npm audit fix

# Update dependencies carefully
npm update
npm outdated
```

---

## 🐛 Troubleshooting Deployment Issues

### **MongoDB Connection Fails**

```
Solution:
1. Verify connection string in .env
2. Check IP whitelist in MongoDB Atlas
3. Verify username/password
4. Check firewall rules
```

### **CORS Errors**

```
Solution:
1. Update CORS origin in server.js to match frontend URL
2. Verify credentials: true for cookies
3. Check preflight requests
```

### **Socket.io Not Connecting**

```
Solution:
1. Verify Socket.io port is accessible
2. Check proxy settings in Nginx/load balancer
3. Verify CORS for WebSocket
```

### **Python Services Not Working**

```
Solution:
1. Verify Python 3.8+ installed
2. Check pip install requirements.txt
3. Verify FFmpeg/FFprobe paths correct
4. Check process logs
```

### **Email Not Sending**

```
Solution:
1. Verify Gmail App Password (not regular password)
2. Check email config in nodemailer
3. Verify SMTP settings
4. Check Firebase/cloud logs
```

---

## 📈 Scaling Considerations

For high traffic:

1. Use **load balancer** (Nginx, HAProxy, AWS Load Balancer)
2. Run multiple backend instances with **PM2 Cluster Mode**
3. Use **Redis** for caching and session storage
4. Separate **transcription service** to dedicated workers
5. Use **CDN** for static assets (CloudFlare, AWS CloudFront)
6. Consider **microservices** for AI/transcription

---

## 🎯 Final Deployment Checklist

- [ ] All environment variables configured
- [ ] Database created and indices set up
- [ ] Backend built and tested locally
- [ ] Frontend built and tested locally
- [ ] SSL certificate obtained
- [ ] Domain configured
- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] OAuth redirect URIs updated
- [ ] Email service tested
- [ ] Database backups configured
- [ ] Monitoring/logging set up
- [ ] Rate limiting enabled
- [ ] Security headers verified
- [ ] Performance tested
- [ ] User acceptance testing completed

---

## 📞 Support & Maintenance

- Monitor logs daily
- Run security audits monthly
- Update dependencies quarterly
- Backup database weekly
- Test disaster recovery monthly
