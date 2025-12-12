import sys
import json
import os
import traceback

# Get audio file path from command line
if len(sys.argv) < 2:
    print("[transcribe] Error: No audio file provided")
    sys.exit(1)

audio_file = sys.argv[1]

# Determine output path
output_path = os.path.join(os.path.dirname(audio_file), "transcript.json")

# Initialize result structure
result = {
    "audio_file": audio_file,
    "duration": 0.0,
    "transcript": [],
    "language": "en"
}

print(f"[transcribe] Starting transcription: {audio_file}")

# Check if file exists
if not os.path.exists(audio_file):
    print(f"[transcribe] Error: Audio file not found: {audio_file}")
    result["error"] = "Audio file not found"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    sys.exit(1)

#
# 1) TRY FASTER-WHISPER FIRST
#
try:
    print("[transcribe] Attempting faster-whisper...")
    from faster_whisper import WhisperModel

    print("[transcribe] Loading faster-whisper model (small, CPU, float32)...")
    model = WhisperModel("small", device="cpu", compute_type="float32")

    print("[transcribe] Transcribing audio...")
    segments, info = model.transcribe(audio_file, language="en")

    # Get duration
    result["duration"] = float(info.duration) if info.duration else 0.0
    result["language"] = info.language if hasattr(info, 'language') else "en"

    print(f"[transcribe] Duration: {result['duration']}s, Language: {result['language']}")

    # Process segments
    segment_count = 0
    for s in segments:
        segment_data = {
            "start": float(s.start),
            "end": float(s.end),
            "text": s.text.strip()
        }
        
        # Add confidence if available
        if hasattr(s, 'avg_logprob'):
            segment_data["confidence"] = float(s.avg_logprob)
        
        result["transcript"].append(segment_data)
        segment_count += 1
        
        # Log progress every 10 segments
        if segment_count % 10 == 0:
            print(f"[transcribe] Processed {segment_count} segments...")

    print(f"[transcribe] Total segments: {segment_count}")

    # Ensure duration is set
    if result["duration"] == 0.0 and len(result["transcript"]) > 0:
        # Calculate duration from last segment
        result["duration"] = result["transcript"][-1]["end"]
        print(f"[transcribe] Calculated duration from segments: {result['duration']}s")

    # Write output
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"[transcribe] SUCCESS: Saved transcript to {output_path}")
    print(f"[transcribe] SUCCESS: {segment_count} segments, {result['duration']:.2f}s")
    sys.exit(0)

except ImportError as e:
    print(f"[transcribe] faster-whisper not available: {e}")
    print("[transcribe] Falling back to openai-whisper...")

except UnicodeEncodeError as e:
    # This shouldn't happen anymore, but just in case
    print(f"[transcribe] Unicode error (ignoring): {e}")
    # Try to save the file anyway
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"[transcribe] SUCCESS: Saved transcript despite unicode warning")
        sys.exit(0)
    except:
        pass

except Exception as e:
    print(f"[transcribe] faster-whisper failed: {e}")
    traceback.print_exc()
    print("[transcribe] Falling back to openai-whisper...")

#
# 2) FALLBACK TO OPENAI WHISPER (requires ffmpeg in PATH)
#
try:
    print("[transcribe] Attempting openai-whisper...")
    import whisper

    print("[transcribe] Loading whisper model (small)...")
    model = whisper.load_model("small")

    print("[transcribe] Transcribing audio...")
    out = model.transcribe(audio_file, language="en", fp16=False)

    # Get duration
    result["duration"] = float(out.get("duration", 0.0))
    result["language"] = out.get("language", "en")

    print(f"[transcribe] Duration: {result['duration']}s, Language: {result['language']}")

    # Process segments
    segment_count = 0
    for seg in out.get("segments", []):
        segment_data = {
            "start": float(seg["start"]),
            "end": float(seg["end"]),
            "text": seg["text"].strip()
        }
        
        # Add confidence if available
        if "avg_logprob" in seg:
            segment_data["confidence"] = float(seg["avg_logprob"])
        
        result["transcript"].append(segment_data)
        segment_count += 1

    print(f"[transcribe] Total segments: {segment_count}")

    # Ensure duration is set
    if result["duration"] == 0.0 and len(result["transcript"]) > 0:
        result["duration"] = result["transcript"][-1]["end"]
        print(f"[transcribe] Calculated duration from segments: {result['duration']}s")

    # Write output
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"[transcribe] SUCCESS: Saved transcript to {output_path}")
    print(f"[transcribe] SUCCESS: {segment_count} segments, {result['duration']:.2f}s")
    sys.exit(0)

except ImportError as e:
    print(f"[transcribe] openai-whisper not available: {e}")
    print("[transcribe] ERROR: No transcription engine available!")

except Exception as e:
    print(f"[transcribe] openai-whisper failed: {e}")
    traceback.print_exc()

# --- BOTH FAILED: WRITE ERROR FILE ---
print("[transcribe] ERROR: All transcription methods failed")
result["transcript"] = []
result["duration"] = 0.0
result["error"] = "All transcription methods failed"

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

sys.exit(1)