# Smart Meeting Assistant - Step-by-Step Platform Deployment Guides

## 🚀 Deploy to Railway.app (RECOMMENDED - Easiest)

### Why Railway?

✅ Simplest deployment  
✅ Free tier available  
✅ Auto-scales  
✅ Built-in monitoring  
✅ Supports Node.js + Python

### Step-by-Step Instructions

#### **1. Install Railway CLI**

```bash
npm install -g @railway/cli
```

#### **2. Prepare Backend**

```bash
cd backend
# Create railway.json for custom config (optional)
echo '{
  "build": "npm install",
  "start": "node server.js"
}' > railway.json

# Create .railwayignore
echo 'node_modules/
.env.local
uploads/*' > .railwayignore
```

#### **3. Initialize and Deploy**

```bash
railway login
cd .. # Go to project root
railway init

# Select project name: smart-meeting-assistant
# Select environment: production
railway link  # Link to existing Railway project (if continuing)
```

#### **4. Set Environment Variables**

```bash
# Using CLI
railway variables set PORT=4000
railway variables set NODE_ENV=production
railway variables set MONGODB_URI=mongodb+srv://...
railway variables set JWT_SECRET=<your-secret>
railway variables set GOOGLE_CLIENT_ID=<your-id>
# ... set all other variables
```

**OR via Railway Dashboard:**

- Go to [railway.app](https://railway.app)
- Select your project
- Go to Variables
- Add all `.env` variables

#### **5. Deploy**

```bash
railway up
```

#### **6. Get Backend URL**

```bash
railway env

# Copy the provided URL, will look like:
# https://your-app.railway.app

# Update GOOGLE_REDIRECT_URI to:
# https://your-app.railway.app/api/auth/google/callback
```

#### **7. Deploy Frontend to Vercel**

```bash
cd frontend

# Create .env.production
echo 'VITE_API_URL=https://your-app.railway.app/api' > .env.production

npm run build
npm install -g vercel
vercel --prod
```

---

## 🚀 Deploy to Vercel (Frontend ONLY)

### Step-by-Step

#### **1. Build Frontend**

```bash
cd frontend
npm install
npm run build
```

#### **2. Create vercel.json** (in frontend root)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_URL": "@vite_api_url"
  },
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

#### **3. Create Environment Variable**

```bash
# In Vercel dashboard → Settings → Environment Variables
# Key: VITE_API_URL
# Value: https://your-backend-url.com/api
```

#### **4. Deploy**

```bash
npm install -g vercel
vercel --prod --env VITE_API_URL=https://your-backend.com/api
```

#### **5. Custom Domain** (Optional)

- Go to Vercel → Project Settings → Domains
- Add your custom domain
- Add CNAME record in DNS: `<vercel-url>.vercel.app`

---

## 🚀 Deploy to Netlify (Frontend ONLY)

### Step-by-Step

#### **1. Create netlify.toml** (in frontend root)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[env]
  VITE_API_URL = "https://your-backend.com/api"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### **2. Create .netlify/state.json**

```json
{
  "siteId": "your-site-id"
}
```

#### **3. Deploy via CLI**

```bash
npm install -g netlify-cli
cd frontend
netlify deploy --prod --dir=dist
```

**OR Connect GitHub:**

- Push to GitHub
- Go to [netlify.com](https://netlify.com)
- Connect GitHub repository
- Set build command: `npm run build`
- Set publish directory: `dist`
- Deploy!

---

## 🚀 Deploy to Heroku (Backend)

### Why Heroku?

✅ Easy deployment  
✅ Dynos scale automatically  
✅ Integrated PostgreSQL/MongoDB support  
⚠️ No free tier anymore (paid only)

### Step-by-Step

#### **1. Create Procfile** (in backend root)

```
web: node server.js
worker: python vosk-live.py
release: npm run seed
```

#### **2. Create .gitignore Updates**

```
# Already should have:
node_modules/
.env
uploads/
```

#### **3. Install Heroku CLI**

```bash
# Windows
choco install heroku-cli

# macOS
brew tap heroku/brew && brew install heroku

# Linux
curl https://cli-assets.heroku.com/install.sh | sh
```

#### **4. Login and Create App**

```bash
heroku login
cd backend
heroku create your-app-name --region eu
```

#### **5. Add MongoDB Atlas**

```bash
heroku addons:create mongolab:sandbox
# or manually set MONGODB_URI
heroku config:set MONGODB_URI=mongodb+srv://...
```

#### **6. Set Environment Variables**

```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=<your-secret>
heroku config:set GOOGLE_CLIENT_ID=<your-id>
heroku config:set GOOGLE_CLIENT_SECRET=<your-secret>
# ... set all other variables
```

#### **7. Deploy**

```bash
git push heroku main
```

#### **8. Check Logs**

```bash
heroku logs --tail
```

#### **9. Add Custom Domain**

```bash
heroku domains:add yourdomain.com
# Add CNAME in DNS to: yourdomain.com.herokudns.com
```

---

## 🚀 Deploy to DigitalOcean (Full Control)

### Step-by-Step (Ubuntu 22.04)

#### **1. Create Droplet**

- Go to [digitalocean.com](https://digitalocean.com)
- Create Droplet (Ubuntu 22.04, $5-6/month)
- SSH into droplet: `ssh root@your_ip`

#### **2. Install System Dependencies**

```bash
apt update && apt upgrade -y
apt install -y nodejs npm python3 python3-pip python3-venv
apt install -y ffmpeg
apt install -y nginx certbot python3-certbot-nginx
```

#### **3. Install MongoDB (Local)**

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod
```

**OR Use MongoDB Atlas** (Recommended):

- Create Atlas cluster
- Get connection string
- Set in `.env`

#### **4. Clone and Setup Backend**

```bash
cd /var/www
git clone https://github.com/yourusername/smart-meeting-assistant.git
cd smart-meeting-assistant/backend

# Create .env file
nano .env
# Paste all environment variables

# Install dependencies
npm install

# Setup Python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

#### **5. Setup PM2 (Process Manager)**

```bash
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'smart-meeting-assistant',
    script: './server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    instances: 'max',
    exec_mode: 'cluster'
  }]
};
EOF

pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### **6. Setup Nginx Reverse Proxy**

```bash
sudo nano /etc/nginx/sites-available/default
```

Paste:

```nginx
upstream backend {
    server localhost:4000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t
sudo systemctl restart nginx
```

#### **7. Setup SSL Certificate**

```bash
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
sudo systemctl restart nginx
```

#### **8. Deploy Frontend (Static)**

```bash
cd ../frontend
npm install
npm run build

# Copy to Nginx
sudo cp -r dist/* /var/www/html/
```

**Or setup Nginx for frontend:**

```bash
mkdir -p /var/www/smart-meeting-assistant-frontend
cp -r dist/* /var/www/smart-meeting-assistant-frontend/

sudo nano /etc/nginx/sites-available/frontend
```

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;
    root /var/www/smart-meeting-assistant-frontend;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://backend;
    }
}
```

#### **9. Monitor & Maintain**

```bash
# Check PM2 status
pm2 status
pm2 logs

# View logs
tail -f /var/www/smart-meeting-assistant/backend/logs/out.log

# Auto-update SSL
sudo certbot renew --dry-run
```

---

## 🚀 Deploy with Docker (Recommended for Scaling)

### Step-by-Step

#### **1. Create Backend Dockerfile**

```dockerfile
# Dockerfile (in backend root)
FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 py3-pip ffmpeg

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy application
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 4000

# Start app
CMD ["node", "server.js"]
```

#### **2. Create Frontend Dockerfile**

```dockerfile
# Dockerfile (in frontend root)
FROM node:20-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### **3. Create nginx.conf** (in frontend root)

```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files $uri /index.html;
    }
    location /api {
        proxy_pass http://backend:4000;
    }
}
```

#### **4. Create docker-compose.yml** (in project root)

```yaml
version: "3.8"

services:
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://mongo:27017/smart-meeting-assistant
      PORT: 4000
    depends_on:
      - mongo
    volumes:
      - ./backend/uploads:/app/uploads

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

#### **5. Build and Run**

```bash
docker-compose up --build
```

#### **6. Deploy to Docker Hub**

```bash
docker login
docker build -t yourusername/smart-meeting-assistant-backend:latest ./backend
docker push yourusername/smart-meeting-assistant-backend:latest

# Deploy to any Docker hosting (AWS ECS, DigitalOcean App Platform, etc.)
```

---

## 🔄 Quick Comparison Table

| Platform         | Backend | Frontend | Cost   | Difficulty | Time    |
| ---------------- | ------- | -------- | ------ | ---------- | ------- |
| **Railway**      | ✅      | ✅       | Low    | Easy       | 30 min  |
| **Vercel**       | ⚠️      | ✅       | Low    | Easy       | 15 min  |
| **Netlify**      | ⚠️      | ✅       | Low    | Easy       | 15 min  |
| **Heroku**       | ✅      | ✅       | Medium | Easy       | 30 min  |
| **DigitalOcean** | ✅      | ✅       | Low    | Medium     | 1 hour  |
| **AWS**          | ✅      | ✅       | Medium | Hard       | 2 hours |
| **Docker**       | ✅      | ✅       | Low    | Medium     | 45 min  |

**Recommended for beginners**: Railway.app or Vercel + Railway  
**Recommended for production**: DigitalOcean or AWS with Docker

---

## 🆘 Troubleshooting Platform-Specific Issues

### Railway

```
Issue: Build fails
Solution: Check railway.json, ensure dependencies specified

Issue: Env vars not working
Solution: Use railway variables set, not in .env file

Issue: Python modules not found
Solution: Add python requirements to build process
```

### Vercel

```
Issue: API calls returning 404
Solution: Verify VITE_API_URL matches backend domain

Issue: Socket.io not connecting
Solution: Vercel doesn't support WebSocket by default - use backend elsewhere
```

### DigitalOcean

```
Issue: Port 4000 not accessible
Solution: Check firewall: ufw allow 4000

Issue: MongoDB won't start
Solution: Check disk space, mongod logs: journalctl -u mongod -n 50
```

### Docker

```
Issue: Container won't start
Solution: docker logs container_name

Issue: MongoDB connection refused
Solution: Ensure mongo service is running first
```

---

## 🎯 After Deployment Checklist

- [ ] Backend URL is accessible
- [ ] Frontend URL is accessible
- [ ] API calls working from frontend
- [ ] Socket.io connected
- [ ] User registration works
- [ ] User login works
- [ ] Can create meeting
- [ ] Can upload audio
- [ ] Transcription works
- [ ] Email notifications sent
- [ ] Google OAuth working
- [ ] Database backups enabled
- [ ] Monitoring setup
- [ ] SSL certificate valid
- [ ] Rate limiting working
- [ ] Logs accessible

---

**Choose your platform above and follow the step-by-step guide!**
