# ✅ Complete Setup Checklist - Phase 5: AI Brain Integration

## 📦 All Files Created (9 Files Total)

### Backend Files (4 files):

1. **`backend/config/ollama.config.js`** ✅
   - Location: `backend/config/ollama.config.js`
   - Contains: Ollama settings + System prompt

2. **`backend/services/aiService.js`** ✅
   - Location: `backend/services/aiService.js`
   - Contains: AI processing engine with Ollama integration

3. **`backend/services/contextManager.js`** ✅
   - Location: `backend/services/contextManager.js`
   - Contains: Conversation history management + MongoDB schema

4. **`backend/routes/assistant.js`** ✅
   - Location: `backend/routes/assistant.js`
   - Contains: API endpoints for AI processing

### Frontend Files (5 files):

5. **`frontend/src/services/aiAssistantService.js`** ✅
   - Location: `frontend/src/services/aiAssistantService.js`
   - Contains: AI API client service

6. **`frontend/src/contexts/AssistantContext.jsx`** ✅
   - Location: `frontend/src/contexts/AssistantContext.jsx`
   - Contains: AI state management context

7. **`frontend/src/components/AIResponseDisplay.jsx`** ✅
   - Location: `frontend/src/components/AIResponseDisplay.jsx`
   - Contains: Chat message UI component

8. **`frontend/src/components/ThinkingIndicator.jsx`** ✅
   - Location: `frontend/src/components/ThinkingIndicator.jsx`
   - Contains: AI thinking/loading animation

9. **`frontend/src/contexts/VoiceCommandContext.jsx`** ✅ (UPDATED)
   - Location: `frontend/src/contexts/VoiceCommandContext.jsx`
   - Contains: Updated with hybrid AI routing

---

## 🔧 Installation Steps

### Step 1: Install Ollama

#### On Linux/macOS:
```bash
curl https://ollama.ai/install.sh | sh
```

#### On Windows:
1. Download from: https://ollama.ai/download
2. Run the installer
3. Ollama will start automatically

#### Verify Installation:
```bash
ollama --version
```

Expected output: `ollama version is 0.x.x`

---

### Step 2: Pull llama3.2 Model

```bash
# Pull the model (this will download ~2GB)
ollama pull llama3.2:latest

# Verify it's installed
ollama list
```

Expected output:
```
NAME                    ID              SIZE      MODIFIED
llama3.2:latest         abc123def       2.0 GB    2 minutes ago
```

#### Test the Model:
```bash
ollama run llama3.2:latest
```
Type: "Hello, how are you?"
Press Enter
You should see an AI response
Press Ctrl+D to exit

---

### Step 3: Verify Ollama Server is Running

```bash
# Check if Ollama API is accessible
curl http://localhost:11434/api/tags
```

Expected output: JSON with list of models

If not running:
```bash
ollama serve
```

---

### Step 4: Copy All Files to Your Project

Create the new files in your project:

```bash
# Backend files
touch backend/config/ollama.config.js
touch backend/services/aiService.js
touch backend/services/contextManager.js
touch backend/routes/assistant.js

# Frontend files
touch frontend/src/services/aiAssistantService.js
touch frontend/src/contexts/AssistantContext.jsx
touch frontend/src/components/AIResponseDisplay.jsx
touch frontend/src/components/ThinkingIndicator.jsx
```

Then copy the content from the artifacts I provided into each file.

---

### Step 5: Install Backend Dependencies

```bash
cd backend

# Install required packages
npm install axios date-fns

# Verify installation
npm list axios date-fns
```

---

### Step 6: Update `backend/server.js`

Add this code to your `backend/server.js`:

```javascript
// Add at the top with other route imports
const assistantRoutes = require('./routes/assistant');

// Add after your other route registrations (around line 50-60)
app.use('/api/assistant', assistantRoutes);
```

Full example:
```javascript
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/assistant', assistantRoutes);  // ADD THIS LINE
```

---

### Step 7: Update `frontend/src/App.jsx`

Wrap your app with the AssistantProvider:

```javascript
// Add imports at the top
import { AssistantProvider } from './contexts/AssistantContext';
import { VoiceCommandProvider } from './contexts/VoiceCommandContext';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <AssistantProvider>         {/* ADD THIS */}
        <VoiceCommandProvider>    {/* This should already exist */}
          <Router>
            {/* Your existing routes */}
          </Router>
        </VoiceCommandProvider>
      </AssistantProvider>          {/* ADD THIS */}
    </AuthProvider>
  );
}

export default App;
```

---

### Step 8: Update Environment Variables (Optional)

Create/update `backend/.env`:

```bash
# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:latest

# Existing variables
MONGODB_URI=mongodb://localhost:27017/smart-meeting-assistant
PORT=4000
JWT_SECRET=your_secret_key
```

---

### Step 9: Start Everything

#### Terminal 1: Start Ollama (if not auto-started)
```bash
ollama serve
```

#### Terminal 2: Start Backend
```bash
cd backend
node server.js
```

Expected output:
```
Server running on port 4000
MongoDB connected successfully
```

#### Terminal 3: Start Frontend
```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in 500 ms
➜  Local:   http://localhost:5173/
```

---

## 🧪 Testing Phase

### Test 1: Check Ollama Health

Open browser console and run:
```javascript
fetch('http://localhost:4000/api/assistant/health', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
}).then(r => r.json()).then(console.log);
```

Expected response:
```json
{
  "success": true,
  "available": true,
  "models": ["llama3.2:latest"],
  "hasRequiredModel": true
}
```

### Test 2: Test AI Processing

In your app, try these voice commands:

#### Simple Commands (Pattern Match):
- ✅ "Show dashboard"
- ✅ "Go to meetings"
- ✅ "Go back"

These should execute instantly (10ms).

#### Complex Commands (AI Processing):
- ✅ "Schedule a meeting tomorrow at 3pm with John about Q4 planning"
- ✅ "Find all meetings with Sarah from last week"
- ✅ "Create a task for John to send the budget report by Friday"

These should take 1-2 seconds and show AI thinking indicator.

### Test 3: Multi-Turn Conversation

Try:
```
You: "Schedule a meeting"
AI: "Sure! When would you like to meet?"
You: "Tomorrow at 3pm"
AI: "Got it. Who should I invite?"
You: "John and Sarah"
```

---

## 🐛 Troubleshooting Guide

### Issue 1: "Cannot find module 'ollama.config'"

**Solution:**
```bash
# Make sure file exists
ls backend/config/ollama.config.js

# If not, create it and copy the content
touch backend/config/ollama.config.js
```

### Issue 2: "AI service unavailable"

**Solution:**
```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# If error, restart Ollama
ollama serve
```

### Issue 3: "Model llama3.2:latest not found"

**Solution:**
```bash
# Pull the model again
ollama pull llama3.2:latest

# Verify
ollama list
```

### Issue 4: Slow AI responses (>5 seconds)

**Solution 1: Use smaller model**
```bash
ollama pull llama3.2:1b
```

**Solution 2: Reduce token limit**
Edit `backend/config/ollama.config.js`:
```javascript
options: {
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  num_predict: 256,  // Reduce from 512 to 256
}
```

### Issue 5: "Conversation not found" error

**Solution:**
Check MongoDB connection:
```bash
# In MongoDB shell
mongosh
use smart-meeting-assistant
db.conversations.find().limit(1)
```

### Issue 6: Frontend "AssistantContext not found"

**Solution:**
Verify `App.jsx` has the correct provider structure:
```javascript
<AssistantProvider>
  <VoiceCommandProvider>
    {/* app content */}
  </VoiceCommandProvider>
</AssistantProvider>
```

---

## 📊 How to Verify Everything Works

### Checklist:

- [ ] Ollama installed and version shows
- [ ] llama3.2:latest model pulled successfully
- [ ] Ollama API responds at localhost:11434
- [ ] All 9 files created in correct locations
- [ ] Backend dependencies installed (axios, date-fns)
- [ ] server.js updated with assistant routes
- [ ] App.jsx updated with AssistantProvider
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Health check endpoint returns success
- [ ] Simple voice commands work (pattern match)
- [ ] Complex voice commands work (AI processing)
- [ ] AI thinking indicator shows during processing
- [ ] Chat messages display correctly
- [ ] Conversation saves to MongoDB

---

## 🎯 Expected Behavior

### Simple Command Flow:
```
User says: "Show dashboard"
    ↓
Pattern matcher: Found! (10ms)
    ↓
Navigate to dashboard
    ↓
Toast: "✅ Navigating to dashboard"
```

### AI Command Flow:
```
User says: "Schedule meeting tomorrow 3pm with John"
    ↓
Pattern matcher: No match
    ↓
Route to AI: Send to Ollama (1-2s)
    ↓
AI thinking indicator shows
    ↓
AI returns: Intent=SCHEDULE_MEETING, params={date, time, participant}
    ↓
Execute action: Open create meeting modal
    ↓
Toast: "✅ I'll schedule a meeting for tomorrow at 3pm with John"
```

---

## 📝 Quick Reference

### Backend Endpoints:

```
POST   /api/assistant/process      - Process user input
GET    /api/assistant/context      - Get conversation history
DELETE /api/assistant/context      - Clear conversation
POST   /api/assistant/feedback     - Submit feedback
GET    /api/assistant/health       - Check AI availability
```

### Frontend Services:

```javascript
// Process message
await aiAssistantService.processMessage("your message");

// Get history
await aiAssistantService.getHistory();

// Clear conversation
await aiAssistantService.clearConversation();
```

---

## 🚀 Next Steps After Setup

Once everything is verified working:

1. **Test extensively** with different commands
2. **Check MongoDB** for conversation storage
3. **Monitor performance** (response times)
4. **Proceed to Phase 6** - Enhanced Capabilities

---

## 📞 Getting Help

If you're stuck:

1. Check all 9 files are created
2. Verify Ollama is running
3. Check backend console for errors
4. Check browser console for errors
5. Verify MongoDB connection
6. Try restarting everything

---

## ✅ Completion Checklist

Mark each as you complete:

- [ ] Ollama installed
- [ ] Model downloaded
- [ ] All files created
- [ ] Dependencies installed
- [ ] server.js updated
- [ ] App.jsx updated
- [ ] Backend running
- [ ] Frontend running
- [ ] Simple commands work
- [ ] AI commands work
- [ ] Ready for Phase 6!

---

**Status**: 📋 Ready for Setup

**Time Required**: ~30-45 minutes

**Reply**: "setup complete" when everything works!