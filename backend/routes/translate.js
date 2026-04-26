// backend/routes/translate.js
// Transcript translation using Groq (free, fast, no local setup needed)

const express = require("express");
const router = express.Router();
const Transcript = require("../models/Transcript");
const Meeting = require("../models/Meeting");
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.1-8b-instant";

// Language display names for the prompt
const LANGUAGE_NAMES = {
  // ── Indian Languages ────────────────────────────────────────────────────────
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  ta: "Tamil",
  te: "Telugu",
  bn: "Bengali",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  ur: "Urdu",
  or: "Odia",
  as: "Assamese",
  // ── International ────────────────────────────────────────────────────────────
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  ru: "Russian",
  tr: "Turkish",
  sv: "Swedish",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese (Simplified)",
  ar: "Arabic",
  id: "Indonesian",
  vi: "Vietnamese",
  uk: "Ukrainian",
  cs: "Czech",
  ro: "Romanian",
  hu: "Hungarian",
  el: "Greek",
  he: "Hebrew",
  th: "Thai",
};

// Translate a single text chunk via Groq
async function translateChunk(text, targetLang) {
  const langName = LANGUAGE_NAMES[targetLang] || targetLang;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: `Translate the following text to ${langName}. 
Output ONLY the translated text with no explanation, no preamble, no quotes.
Preserve the meaning exactly. Keep proper nouns, names, and numbers as-is.

Text to translate:
${text}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  const translated = (completion.choices[0]?.message?.content || "").trim();
  return translated;
}

// POST /api/translate/:meetingId
// Body: { targetLanguage: "hi" }
// Translates all transcript segments and returns them
router.post("/:meetingId", async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { targetLanguage } = req.body;

    if (!targetLanguage) {
      return res.status(400).json({ error: "targetLanguage is required" });
    }

    if (!LANGUAGE_NAMES[targetLanguage]) {
      return res.status(400).json({
        error: `Unsupported language: ${targetLanguage}`,
        supported: Object.keys(LANGUAGE_NAMES),
      });
    }

    // Fetch transcripts
    const transcripts = await Transcript.find({
      meetingId,
      processingStatus: { $in: ["completed", "live"] },
    });

    if (!transcripts || transcripts.length === 0) {
      return res.status(404).json({ error: "No transcripts found" });
    }

    console.log(
      `🌐 Translating meeting ${meetingId} to ${LANGUAGE_NAMES[targetLanguage]}`,
    );

    // Check if original language is same as target
    const originalLang =
      transcripts[0]?.spokenLanguage || transcripts[0]?.language || "en";
    const originalLangBase = originalLang.split("-")[0];
    if (originalLangBase === targetLanguage) {
      return res.json({
        success: true,
        targetLanguage,
        targetLanguageName: LANGUAGE_NAMES[targetLanguage],
        originalLanguage: originalLang,
        transcripts: transcripts.map((t) => ({
          _id: t._id,
          userName: t.userName,
          language: t.language,
          segments: t.segments,
          fullText: t.fullText,
        })),
        cached: true,
        message: "Original language matches target — no translation needed",
      });
    }

    // Translate each transcript
    const translatedTranscripts = [];

    for (const transcript of transcripts) {
      console.log(
        `  📄 Translating transcript for ${transcript.userName || "Unknown"} (${transcript.segments?.length || 0} segments)`,
      );

      const translatedSegments = [];
      const segments = transcript.segments || [];

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const plainSeg = seg.toObject ? seg.toObject() : { ...seg };

        try {
          const translated = await translateChunk(
            plainSeg.text,
            targetLanguage,
          );
          console.log(
            `    ✅ Segment ${i + 1}/${segments.length}: "${translated.substring(0, 50)}"`,
          );

          translatedSegments.push({
            start: plainSeg.start,
            end: plainSeg.end,
            text: translated || plainSeg.text,
            originalText: plainSeg.text,
            speaker: plainSeg.speaker,
            confidence: plainSeg.confidence,
          });
        } catch (segErr) {
          console.error(`    ❌ Segment ${i + 1} failed:`, segErr.message);
          translatedSegments.push({
            start: plainSeg.start,
            end: plainSeg.end,
            text: plainSeg.text,
            originalText: plainSeg.text,
            speaker: plainSeg.speaker,
            confidence: plainSeg.confidence,
          });
        }
      }

      const translatedFullText = translatedSegments
        .map((s) => s.text)
        .join(" ");

      translatedTranscripts.push({
        _id: transcript._id,
        userName: transcript.userName,
        language: targetLanguage,
        originalLanguage: transcript.language,
        segments: translatedSegments,
        fullText: translatedFullText,
      });
    }

    console.log(
      `✅ Translation complete: ${meetingId} → ${LANGUAGE_NAMES[targetLanguage]}`,
    );

    res.json({
      success: true,
      targetLanguage,
      targetLanguageName: LANGUAGE_NAMES[targetLanguage],
      originalLanguage: originalLang,
      transcripts: translatedTranscripts,
    });
  } catch (err) {
    console.error("❌ Translation error:", err);
    res.status(500).json({
      error: "Translation failed",
      message: err.message,
    });
  }
});

// GET /api/translate/languages — list all supported languages
router.get("/languages", (req, res) => {
  res.json({
    success: true,
    languages: Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
      code,
      name,
    })),
  });
});

module.exports = router;
module.exports.LANGUAGE_NAMES = LANGUAGE_NAMES;
