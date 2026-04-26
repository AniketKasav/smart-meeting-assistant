import sys
import json
import os
import traceback

# ✅ FIX: Force UTF-8 on Windows console to prevent UnicodeEncodeError
# The arrow character (→) in print statements was crashing on Windows
# and saving an empty transcript before segments were collected
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Get audio file path from command line
if len(sys.argv) < 2:
    print("[transcribe] Error: No audio file provided")
    sys.exit(1)

audio_file = sys.argv[1]

# Optional: explicit language override as second arg (e.g. "hi", "fr")
# If not provided or "auto", Whisper will auto-detect
requested_language = sys.argv[2] if len(sys.argv) > 2 else "auto"
whisper_language = None if requested_language in ("auto", "", "detect") else requested_language

output_path = os.path.join(os.path.dirname(audio_file), "transcript.json")

result = {
    "audio_file": audio_file,
    "duration": 0.0,
    "transcript": [],
    "language": "auto"
}

print(f"[transcribe] Starting transcription: {audio_file}")
print(f"[transcribe] Language setting: {'auto-detect' if whisper_language is None else whisper_language}")

if not os.path.exists(audio_file):
    print(f"[transcribe] Error: Audio file not found: {audio_file}")
    result["error"] = "Audio file not found"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    sys.exit(1)

# Keep segments_list accessible in the except block
segments_list = []

# ─────────────────────────────────────────────────────────────────────────────
# 1) TRY FASTER-WHISPER FIRST
# ─────────────────────────────────────────────────────────────────────────────
try:
    print("[transcribe] Attempting faster-whisper...")
    from faster_whisper import WhisperModel

    print("[transcribe] Loading faster-whisper model (medium, CPU, float32)...")
    model = WhisperModel("medium", device="cpu", compute_type="float32")

    print("[transcribe] Transcribing audio...")
    segments_generator, info = model.transcribe(
        audio_file,
        language=whisper_language,
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=500),
        # ── Hallucination suppression ──────────────────────────────────────────
        # log_prob_threshold: discard segments where model is very uncertain
        # no_speech_threshold: skip segments that are likely background noise
        # compression_ratio_threshold: discard repetitive/hallucinated text
        log_prob_threshold=-1.0,
        no_speech_threshold=0.6,
        compression_ratio_threshold=2.4,
    )

    result["duration"] = float(info.duration) if info.duration else 0.0
    result["language"] = info.language if hasattr(info, 'language') else (whisper_language or "auto")

    print(f"[transcribe] Duration: {result['duration']}s | Detected language: {result['language']}")

    segment_count = 0
    print("[transcribe] Processing segments...")

    for s in segments_generator:
        segment_data = {
            "start": float(s.start),
            "end": float(s.end),
            # ✅ FIX: Replace arrow with plain text to avoid Windows Unicode crash
            "text": s.text.strip(),
        }
        if hasattr(s, 'avg_logprob'):
            segment_data["confidence"] = float(s.avg_logprob)

        segments_list.append(segment_data)
        segment_count += 1

        # ✅ FIX: No more → arrow in print — was causing UnicodeEncodeError on Windows
        print(f"[transcribe] Segment {segment_count}: {segment_data['start']:.2f}s to {segment_data['end']:.2f}s")
        print(f"[transcribe]   Text: '{segment_data['text'][:80]}'")

        if segment_count % 10 == 0:
            print(f"[transcribe] Processed {segment_count} segments...")

    result["transcript"] = segments_list

    print(f"[transcribe] Total segments: {segment_count}")

    if segment_count == 0:
        print("[transcribe] WARNING: No segments generated!")
    else:
        text_segments = [s for s in segments_list if s['text'].strip()]
        print(f"[transcribe] Segments with text: {len(text_segments)}/{segment_count}")

    if result["duration"] == 0.0 and result["transcript"]:
        result["duration"] = result["transcript"][-1]["end"]
        print(f"[transcribe] Calculated duration from segments: {result['duration']}s")

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"[transcribe] SUCCESS: Saved transcript to {output_path}")
    print(f"[transcribe] SUCCESS: {segment_count} segments | {result['duration']:.2f}s | lang={result['language']}")

    if result["transcript"]:
        full_text = " ".join([s["text"] for s in result["transcript"]])
        sample_text = " ".join([s["text"] for s in result["transcript"][:3]])
        print(f"[transcribe] Sample: {sample_text[:100]}...")
        print(f"[transcribe] FULL TRANSCRIPT: \"{full_text}\"")

    sys.exit(0)

except ImportError as e:
    print(f"[transcribe] faster-whisper not available: {e}")
    print("[transcribe] Falling back to openai-whisper...")

except UnicodeEncodeError as e:
    # ✅ FIX: This was the main bug — segments_list is now defined outside
    # the loop so it's accessible here with all collected segments
    print(f"[transcribe] Unicode warning (saving anyway): {e}")
    try:
        if segments_list:
            result["transcript"] = segments_list
            if result["duration"] == 0.0:
                result["duration"] = segments_list[-1]["end"]

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"[transcribe] SUCCESS: Saved despite unicode warning — {len(result['transcript'])} segments")
    except Exception as save_err:
        print(f"[transcribe] Failed to save after unicode error: {save_err}")
    sys.exit(0)

except Exception as e:
    print(f"[transcribe] faster-whisper failed: {e}")
    traceback.print_exc()
    print("[transcribe] Falling back to openai-whisper...")

# ─────────────────────────────────────────────────────────────────────────────
# 2) FALLBACK: OPENAI WHISPER
# ─────────────────────────────────────────────────────────────────────────────
try:
    print("[transcribe] Attempting openai-whisper...")
    import whisper

    print("[transcribe] Loading whisper model (medium)...")
    model = whisper.load_model("medium")

    print("[transcribe] Transcribing audio...")
    out = model.transcribe(
        audio_file,
        language=whisper_language,
        fp16=False,
    )

    result["duration"] = float(out.get("duration", 0.0))
    result["language"] = out.get("language", whisper_language or "auto")

    print(f"[transcribe] Duration: {result['duration']}s | Detected language: {result['language']}")

    segments_list = []
    segment_count = 0

    for seg in out.get("segments", []):
        segment_data = {
            "start": float(seg["start"]),
            "end": float(seg["end"]),
            "text": seg["text"].strip(),
        }
        if "avg_logprob" in seg:
            segment_data["confidence"] = float(seg["avg_logprob"])

        segments_list.append(segment_data)
        segment_count += 1
        print(f"[transcribe] Segment {segment_count}: '{segment_data['text'][:80]}'")

    result["transcript"] = segments_list

    if result["duration"] == 0.0 and result["transcript"]:
        result["duration"] = result["transcript"][-1]["end"]

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"[transcribe] SUCCESS: {segment_count} segments | {result['duration']:.2f}s | lang={result['language']}")

    if result["transcript"]:
        sample_text = " ".join([s["text"] for s in result["transcript"][:3]])
        print(f"[transcribe] Sample: {sample_text[:100]}...")

    sys.exit(0)

except ImportError as e:
    print(f"[transcribe] openai-whisper not available: {e}")
    print("[transcribe] ERROR: No transcription engine available!")

except Exception as e:
    print(f"[transcribe] openai-whisper failed: {e}")
    traceback.print_exc()

# ─────────────────────────────────────────────────────────────────────────────
# BOTH FAILED
# ─────────────────────────────────────────────────────────────────────────────
print("[transcribe] ERROR: All transcription methods failed")
result["transcript"] = []
result["duration"] = 0.0
result["error"] = "All transcription methods failed"

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

sys.exit(1)