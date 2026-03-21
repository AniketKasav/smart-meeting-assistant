# backend/services/diarizationService.py

import sys
import json
import os
import numpy as np
import soundfile as sf
import torch

# Monkey-patch torch.load to allow pyannote classes
original_load = torch.load
def patched_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return original_load(*args, **kwargs)
torch.load = patched_load

from pyannote.audio import Pipeline

if len(sys.argv) < 3:
    print("Usage: diarizationService.py <audio.wav> <transcript.json>")
    sys.exit(1)

audio_path = sys.argv[1]
transcript_path = sys.argv[2]

hf_token = os.getenv("HF_TOKEN")

# Load transcript
with open(transcript_path, "r", encoding="utf-8") as f:
    transcript_data = json.load(f)

segments = transcript_data.get("transcript", [])

# Load audio using soundfile (no torchaudio needed)
print(f"[diarization] Loading audio: {audio_path}", flush=True)
audio_data, sample_rate = sf.read(audio_path, dtype='float32')

# Convert to torch tensor - shape must be (channels, time)
if audio_data.ndim == 1:
    audio_data = audio_data[np.newaxis, :]  # mono: (1, time)
else:
    audio_data = audio_data.T  # stereo: (2, time)

waveform = torch.from_numpy(audio_data)
print(f"[diarization] Audio loaded: shape={waveform.shape}, sr={sample_rate}", flush=True)

# Load diarization pipeline
print(f"[diarization] Loading pyannote pipeline...", flush=True)
try:
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization-3.1",
        token=hf_token
    )
except TypeError:
    pipeline = Pipeline.from_pretrained(
        "pyannote/speaker-diarization",
        use_auth_token=hf_token
    )

print(f"[diarization] Pipeline loaded. Running diarization...", flush=True)

# Pass audio as dictionary
audio_dict = {
    "waveform": waveform,
    "sample_rate": sample_rate
}

diarization = pipeline(audio_dict)
print(f"[diarization] Diarization complete.", flush=True)

# Extract speaker turns
speaker_turns = []

try:
    # pyannote v3 - DiarizeOutput
    annotation = diarization.speaker_diarization
    for segment, track, label in annotation.itertracks(yield_label=True):
        speaker_turns.append({
            "speaker": label,
            "start": segment.start,
            "end": segment.end
        })
except AttributeError:
    # pyannote v2 - direct Annotation object
    for segment, track, label in diarization.itertracks(yield_label=True):
        speaker_turns.append({
            "speaker": label,
            "start": segment.start,
            "end": segment.end
        })

print(f"[diarization] Found {len(speaker_turns)} speaker turns", flush=True)

# Assign speakers to transcript segments
for seg in segments:
    seg["speaker"] = "Unknown"
    best_overlap = 0
    best_speaker = "Unknown"

    for sp in speaker_turns:
        overlap_start = max(seg["start"], sp["start"])
        overlap_end = min(seg["end"], sp["end"])
        overlap = max(0, overlap_end - overlap_start)

        if overlap > best_overlap:
            best_overlap = overlap
            best_speaker = sp["speaker"]

    seg["speaker"] = best_speaker

# Save updated transcript
with open(transcript_path, "w", encoding="utf-8") as f:
    json.dump(transcript_data, f, indent=2, ensure_ascii=False)

print("[diarization] Speaker labeling completed successfully", flush=True)