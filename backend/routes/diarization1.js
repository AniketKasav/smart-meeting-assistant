// backend/routes/diarization.js
const express = require('express');
const { spawn } = require('child_process');
const Transcript = require('../models/Transcript');
const Meeting = require('../models/Meeting');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.post('/:meetingId/run', async (req, res) => {
  try {
    const { meetingId } = req.params;

    console.log('[diarization] Request for meeting:', meetingId);

    // 1️⃣ Fetch transcript from DB - try both custom meetingId and MongoDB _id
    let transcript = await Transcript.findOne({
      meetingId,
      processingStatus: 'completed'
    });

    // If not found and looks like MongoDB ID, try finding meeting first then transcript
    if (!transcript && /^[0-9a-fA-F]{24}$/.test(meetingId)) {
      console.log('[diarization] Trying to find meeting by MongoDB _id');
      const meeting = await Meeting.findById(meetingId);
      if (meeting) {
        console.log('[diarization] Found meeting, now looking for transcript with meetingId:', meeting.meetingId);
        transcript = await Transcript.findOne({
          meetingId: meeting.meetingId,
          processingStatus: 'completed'
        });
      }
    }

    if (!transcript) {
      console.log('[diarization] Transcript not found');
      return res.status(404).json({ error: 'Transcript not found' });
    }

    console.log('[diarization] Found transcript for:', transcript.meetingId);

    if (!transcript.audioPath) {
      return res.status(400).json({ error: 'audioPath missing in transcript' });
    }

    // 2️⃣ Safely derive transcript.json path
    const transcriptFilePath = path.join(
      path.dirname(transcript.audioPath),
      'transcript.json'
    );

    if (!fs.existsSync(transcriptFilePath)) {
      return res.status(404).json({ error: 'transcript.json not found on disk' });
    }

    // 3️⃣ Run Python diarization with unbuffered output
    const py = spawn(
      'python',
      [
        '-u', // Unbuffered stdout/stderr
        path.join(__dirname, '../services/diarizationService.py'),
        transcript.audioPath,
        transcriptFilePath
      ],
      {
        env: { ...process.env } // ✅ passes HF_TOKEN
      }
    );

    let processCompleted = false;
    let outputBuffer = '';
    let errorBuffer = '';

    py.stdout.on('data', data => {
      const message = data.toString();
      outputBuffer += message;
      console.log('[diarization]', message);
    });

    py.stderr.on('data', data => {
      const message = data.toString();
      errorBuffer += message;
      console.error('[diarization]', message);
    });

    py.on('error', (error) => {
      console.error('[diarization] Process error:', error);
      if (!processCompleted && !res.headersSent) {
        processCompleted = true;
        return res.status(500).json({ error: 'Failed to start diarization process' });
      }
    });

    py.on('close', async (code) => {
      if (processCompleted || res.headersSent) return;
      processCompleted = true;

      console.log('[diarization] Process closed with code:', code);

      if (code !== 0) {
        console.error('[diarization] Process failed with error output:', errorBuffer);
        return res.status(500).json({ error: 'Diarization process failed', details: errorBuffer.substring(0, 500) });
      }

      try {
        // 4️⃣ Reload updated transcript.json safely
        const updatedRaw = fs.readFileSync(transcriptFilePath, 'utf-8');
        const updated = JSON.parse(updatedRaw);

        console.log('[diarization] Updated transcript has', updated.transcript?.length, 'segments');

        // 5️⃣ Save speaker-labeled segments
        transcript.segments = updated.transcript;
        await transcript.save();

        console.log('[diarization] ✅ Successfully saved updated segments to database');
        res.json({ success: true });
      } catch (err) {
        console.error('[diarization] Error saving results:', err);
        return res.status(500).json({ error: 'Failed to save diarization results' });
      }
    });

    // Set a timeout of 5 minutes
    setTimeout(() => {
      if (!processCompleted && !res.headersSent) {
        processCompleted = true;
        py.kill();
        console.error('[diarization] Process timeout - killing process');
        res.status(504).json({ error: 'Diarization process timeout' });
      }
    }, 5 * 60 * 1000);

  } catch (err) {
    console.error('[diarization] Fatal error:', err);
    res.status(500).json({ error: 'Internal diarization error' });
  }
});

module.exports = router;
