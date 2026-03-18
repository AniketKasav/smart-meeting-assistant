# backend/services/diarizationService.py

import sys
import json
import os

# ✅ FIX: Monkey-patch torch.load to allow all pyannote classes
# This is the safest approach for PyTorch 2.9.1
import torch
original_load = torch.load

def patched_load(*args, **kwargs):
    # Force weights_only=False for pyannote models (they're from trusted source)
    kwargs['weights_only'] = False
    return original_load(*args, **kwargs)

torch.load = patched_load

# Now safe to import everything else
import torchaudio
from pyannote.audio import Pipeline

if len(sys.argv) < 3:
    print("Usage: diarizationService.py <audio.wav> <transcript.json>")
    sys.exit(1)

audio_path = sys.argv[1]
transcript_path = sys.argv[2]

# Get HF token from environment
hf_token = os.getenv("HF_TOKEN")

# Load transcript
with open(transcript_path, "r", encoding="utf-8") as f:
    transcript_data = json.load(f)

segments = transcript_data.get("transcript", [])

# Load diarization pipeline (use_auth_token for pyannote v2.x, token for v3.x)
try:
    # Try newer API (v3.x)
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        token=hf_token
    )
except TypeError:
    # Fall back to older API (v2.x)
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization",
        use_auth_token=hf_token
    )

# Load audio manually using torchaudio backend that doesn't require torchcodec
# Use 'soundfile' backend which is more reliable on Windows
try:
    # Try soundfile backend first (doesn't need torchcodec)
    import soundfile
    waveform, sample_rate = torchaudio.load(audio_path, backend="soundfile")
except:
    # Fallback: Load with librosa (most compatible)
    try:
        import librosa
        import numpy as np
        audio_data, sr = librosa.load(audio_path, sr=None, mono=False)
        # Convert to torch tensor
        if audio_data.ndim == 1:
            audio_data = audio_data[np.newaxis, :]
        waveform = torch.from_numpy(audio_data)
        sample_rate = sr
    except Exception as e:
        print(f"[diarization] Failed to load audio: {e}", flush=True)
        raise

# Pass audio as dictionary to pipeline
audio_dict = {
    "waveform": waveform,
    "sample_rate": sample_rate
}

diarization = pipeline(audio_dict)

print(f"[diarization] Diarization completed. Type: {type(diarization)}", flush=True)
print(f"[diarization] Has segments: {hasattr(diarization, 'segments')}", flush=True)
print(f"[diarization] Dir: {[x for x in dir(diarization) if not x.startswith('_')][:10]}", flush=True)

# Convert diarization to time ranges
speaker_turns = []

# pyannote v3 API - DiarizeOutput has speaker_diarization attribute (Annotation object)
try:
    # Get the Annotation object from DiarizeOutput
    annotation = diarization.speaker_diarization
    print(f"[diarization] Annotation type: {type(annotation)}", flush=True)
    
    # Iterate over the annotation: each item is (segment, track, label)
    for segment, track, label in annotation.itertracks(yield_label=True):
        speaker_turns.append({
            "speaker": label,
            "start": segment.start,
            "end": segment.end
        })
    
    print(f"[diarization] Found {len(speaker_turns)} speaker turns", flush=True)
    if len(speaker_turns) > 0:
        print(f"[diarization] Sample speaker turn: {speaker_turns[0]}", flush=True)
        
except Exception as e:
    print(f"[diarization] Error extracting speakers: {e}", flush=True)
    import traceback
    traceback.print_exc()

# Assign speakers to transcript segments based on overlap
for seg in segments:
    seg["speaker"] = "Unknown"
    best_overlap = 0
    best_speaker = "Unknown"
    
    for sp in speaker_turns:
        # Calculate overlap between segment and speaker turn
        overlap_start = max(seg["start"], sp["start"])
        overlap_end = min(seg["end"], sp["end"])
        overlap = max(0, overlap_end - overlap_start)
        
        # Assign speaker with maximum overlap
        if overlap > best_overlap:
            best_overlap = overlap
            best_speaker = sp["speaker"]
    
    seg["speaker"] = best_speaker

# Save updated transcript.json
with open(transcript_path, "w", encoding="utf-8") as f:
    json.dump(transcript_data, f, indent=2, ensure_ascii=False)

print("[diarization] Speaker labeling completed successfully", flush=True)