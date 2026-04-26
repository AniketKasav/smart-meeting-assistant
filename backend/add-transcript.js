// Quick script to add transcript to MongoDB
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const Transcript = require('./models/Transcript');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/smart-meeting-assistant";

async function addTranscript() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Read transcript.json
    const transcriptPath = 'c:\\Users\\anike\\Desktop\\smart-meeting-assistant2\\backend\\uploads\\meeting_test_diarization_20251218112838\\transcript.json';
    const audioPath = 'c:\\Users\\anike\\Desktop\\smart-meeting-assistant2\\backend\\uploads\\meeting_test_diarization_20251218112838\\final.wav';
    
    const transcriptData = JSON.parse(fs.readFileSync(transcriptPath, 'utf-8'));
    
    // Create transcript entry
    const transcript = new Transcript({
      meetingId: 'meeting_test_diarization_20251218112838',
      userName: 'System',
      audioPath: audioPath,
      duration: transcriptData.duration,
      language: transcriptData.language,
      segments: transcriptData.transcript,
      processingStatus: 'completed'
    });

    await transcript.save();
    console.log('✅ Transcript saved to MongoDB');
    console.log('   Meeting ID:', transcript.meetingId);
    console.log('   Segments:', transcript.segments.length);
    console.log('   Duration:', transcript.duration);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addTranscript();
