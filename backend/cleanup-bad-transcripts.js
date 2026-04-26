// cleanup-bad-transcripts.js — Remove Whisper hallucination docs with garbage content
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Transcript = require('./models/Transcript');

(async () => {
  await connectDB();
  await new Promise(r => setTimeout(r, 1000));

  // Remove Whisper transcripts that are clearly garbage / hallucinations:
  // - "or text number at it."
  // - "Продолжение следует" (Russian hallucination)
  // - "Obrigado" / "Gracias" (Portuguese/Spanish hallucinations)
  // - Single-word / very short Whisper docs
  const whisperDocs = await Transcript.find({
    audioPath: { $exists: true, $ne: null }
  }).lean();

  const toDelete = [];
  const hallucinations = [
    /^or text number at it/i,
    /продолжение следует/i,
    /^(obrigado|gracias|thank you\.?\s*){1,5}$/i,
    /hypotheses.*hypotheses.*hypotheses/i,
  ];

  for (const doc of whisperDocs) {
    const ft = (doc.fullText || '').trim();
    const isHallucination = hallucinations.some(re => re.test(ft));
    const isTooShort = ft.length < 5 && doc.segments?.length <= 1;
    if (isHallucination || isTooShort) {
      toDelete.push(doc._id);
      console.log(`🗑  Will delete: "${ft.substring(0, 80)}" (meetingId: ${doc.meetingId})`);
    }
  }

  if (toDelete.length > 0) {
    await Transcript.deleteMany({ _id: { $in: toDelete } });
    console.log(`\n✅ Deleted ${toDelete.length} hallucination transcripts`);
  } else {
    console.log('\n✅ No hallucination transcripts found');
  }

  mongoose.connection.close();
  process.exit(0);
})();
