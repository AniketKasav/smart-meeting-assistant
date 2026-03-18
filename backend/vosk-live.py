#!/usr/bin/env python3
# backend/vosk-live.py
# REAL-TIME STREAMING TRANSCRIPTION USING VOSK
# Stable | Low-latency | No hallucinations

import sys
import json
import os
import wave
import tempfile

from vosk import Model, KaldiRecognizer

# ----------------------------
# CONFIG
# ----------------------------
SAMPLE_RATE = 16000
MODEL_PATH = "vosk-model-small-en-us-0.15"  # download once

# Force UTF-8 on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", line_buffering=True)

# ----------------------------
# LOAD MODEL (ONCE)
# ----------------------------
if not os.path.exists(MODEL_PATH):
    print(f"[VOSK] ❌ Model not found: {MODEL_PATH}", file=sys.stderr, flush=True)
    print("[VOSK] Download from: https://alphacephei.com/vosk/models", file=sys.stderr, flush=True)
    sys.exit(1)

print("[VOSK] Loading model...", flush=True)
model = Model(MODEL_PATH)
recognizer = KaldiRecognizer(model, SAMPLE_RATE)
recognizer.SetWords(True)

print("__VOSK_READY__", flush=True)  # Signal Node.js we are ready

# ----------------------------
# HELPERS
# ----------------------------
def extract_pcm_from_wav(wav_bytes: bytes) -> bytes:
    """
    Extract raw PCM audio from WAV bytes
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(wav_bytes)
        tmp_path = tmp.name

    try:
        with wave.open(tmp_path, "rb") as wf:
            if wf.getnchannels() != 1:
                raise ValueError("Audio must be mono")
            if wf.getframerate() != SAMPLE_RATE:
                raise ValueError("Audio must be 16kHz")
            pcm_data = wf.readframes(wf.getnframes())
            return pcm_data
    finally:
        os.unlink(tmp_path)

# ----------------------------
# MAIN LOOP (STREAMING)
# ----------------------------
import struct

try:
    while True:
        # Read 4-byte length prefix
        size_bytes = sys.stdin.buffer.read(4)
        if not size_bytes:
            break

        size = struct.unpack("<I", size_bytes)[0]
        wav_bytes = sys.stdin.buffer.read(size)

        if not wav_bytes:
            break

        try:
            pcm = extract_pcm_from_wav(wav_bytes)
        except Exception:
            continue

        if recognizer.AcceptWaveform(pcm):
            result = json.loads(recognizer.Result())
            words = result.get("result", [])

            if words:
                print(json.dumps({
                    "type": "final",
                    "words": words,
                    "text": result.get("text", "")
                }), flush=True)
        else:
            partial = json.loads(recognizer.PartialResult())
            partial_text = partial.get("partial", "").strip()

            if partial_text:
                print(json.dumps({
                    "type": "partial",
                    "text": partial_text
                }), flush=True)

except KeyboardInterrupt:
    pass
except Exception as e:
    print(f"[VOSK] ❌ Error: {e}", file=sys.stderr, flush=True)
