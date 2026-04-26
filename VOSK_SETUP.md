# Setup Vosk (FREE Streaming ASR)

## Install Vosk
```bash
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install vosk
pip install vosk
```

## Download Model
1. Go to: https://alphacephei.com/vosk/models
2. Download: **vosk-model-small-en-us-0.15.zip** (40MB, fast)
   - Or for better quality: **vosk-model-en-us-0.22.zip** (1.8GB, slower)
3. Extract the folder to: `backend/vosk-model-small-en-us-0.15/`

## File Structure
```
backend/
  ├── vosk-model-small-en-us-0.15/
  │   ├── am/
  │   ├── conf/
  │   ├── graph/
  │   └── ...
  ├── transcribe-live-vosk.py
  └── server.js
```

## Test
```bash
# Start server
node server.js

# You should see:
# [vosk] Loading Vosk streaming model (ONE-TIME)...
# [vosk] Model loaded in 2.3s - Ready for streaming!
# [vosk] READY - Send audio file paths via stdin
```

## Benefits
✅ Completely FREE (no API costs)
✅ Works OFFLINE (no internet needed)
✅ True streaming (word-by-word)
✅ Fast (~50-100ms per chunk)
✅ Word timestamps included
✅ No hallucinations (designed for streaming)

## Comparison

| Feature | Whisper (Current) | Vosk (FREE) | Google Speech-to-Text |
|---------|------------------|-------------|----------------------|
| Cost | FREE | FREE | $1.44/hour |
| Offline | ✅ Yes | ✅ Yes | ❌ No (needs internet) |
| Latency | 5 seconds | 100ms | 100ms |
| Accuracy | Good | Good | Excellent |
| Streaming | ❌ No | ✅ Yes | ✅ Yes |
| Hallucinations | ⚠️ Sometimes | ✅ Rare | ✅ Never |

## Next Steps
1. Install vosk: `pip install vosk`
2. Download model (link above)
3. Extract to backend folder
4. Restart server
5. Test live transcription!
