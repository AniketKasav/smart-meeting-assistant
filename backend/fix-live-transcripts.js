// fix-live-transcripts.js — Diagnostic + repair script
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Transcript = require('./models/Transcript');

(async () => {
  await connectDB();
  await new Promise(r => setTimeout(r, 1000));

  // 1. Promote any remaining live transcripts
  const promoted = await Transcript.updateMany(
    { processingStatus: 'live' },
    { $set: { processingStatus: 'completed' } }
  );
  console.log(`\n✅ Promoted ${promoted.modifiedCount} live → completed\n`);

  // 2. Show all transcripts: count segments & fullText length
  const all = await Transcript.find({}).sort({ createdAt: -1 }).limit(20).lean();
  console.log(`📊 Total transcripts (latest 20):\n`);
  all.forEach(t => {
    console.log(`  meetingId: ${t.meetingId}`);
    console.log(`    status   : ${t.processingStatus}`);
    console.log(`    segments : ${t.segments?.length || 0}`);
    console.log(`    fullText : "${(t.fullText || '').substring(0, 80)}"`);
    console.log(`    audioPath: ${t.audioPath ? 'YES (Whisper)' : 'NO (Live/WebSpeech)'}`);
    console.log();
  });

  // 3. Find meetings that still have no transcript content
  const empty = await Transcript.find({
    $or: [
      { segments: { $size: 0 } },
      { fullText: '' },
      { fullText: null }
    ]
  }).lean();
  console.log(`⚠️  Transcripts with no content: ${empty.length}`);
  empty.forEach(t => console.log(`   - ${t.meetingId} (${t.processingStatus})`));

  mongoose.connection.close();
  process.exit(0);
})();
