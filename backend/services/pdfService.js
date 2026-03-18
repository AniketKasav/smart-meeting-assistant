// backend/services/pdfService.js
const PDFDocument = require('pdfkit');
const { format } = require('date-fns');

/**
 * Generate a professional meeting summary PDF
 * @param {Object} meeting - Meeting document
 * @param {Array} transcripts - Transcript documents
 * @returns {Buffer} - PDF buffer
 */
function generateMeetingPDF(meeting, transcripts = []) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true // ✅ IMPORTANT: Enable page buffering for footer
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Colors
      const primaryColor = '#8b5cf6'; // purple
      const textColor = '#1e293b';
      const lightGray = '#94a3b8';
      const darkGray = '#334155';

      // Header
      doc.fontSize(24)
         .fillColor(primaryColor)
         .text('Meeting Summary Report', { align: 'center' });

      doc.moveDown(0.5);
      doc.fontSize(10)
         .fillColor(lightGray)
         .text('Smart Meeting Assistant', { align: 'center' });

      doc.moveDown(1);
      
      // Horizontal line
      doc.moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .strokeColor(lightGray)
         .stroke();

      doc.moveDown(1);

      // Meeting Info
      doc.fontSize(16)
         .fillColor(textColor)
         .text(meeting.title || 'Untitled Meeting', { underline: true });

      doc.moveDown(0.5);

      doc.fontSize(10)
         .fillColor(darkGray);

      const meetingDate = format(new Date(meeting.startedAt), 'MMMM d, yyyy • h:mm a');
      doc.text(`Date: ${meetingDate}`);
      
      if (meeting.duration) {
        const mins = Math.floor(meeting.duration / 60);
        const secs = Math.floor(meeting.duration % 60);
        doc.text(`Duration: ${mins}m ${secs}s`);
      }

      if (meeting.participants && meeting.participants.length > 0) {
        const participantNames = meeting.participants.map(p => p.name).join(', ');
        doc.text(`Participants: ${participantNames}`);
      }

      doc.moveDown(1);

      // Summary section
      if (meeting.summary) {
        const summary = meeting.summary;

        // Executive Summary
        if (summary.text || summary.executiveSummary) {
          addSection(doc, 'Executive Summary', primaryColor);
          doc.fontSize(10)
             .fillColor(textColor)
             .text(summary.text || summary.executiveSummary, {
               align: 'justify',
               lineGap: 2
             });
          doc.moveDown(1);
        }

        // Sentiment
        if (summary.sentiment) {
          addSection(doc, 'Meeting Sentiment', primaryColor);
          const sentimentEmoji = {
            positive: '😊 Positive',
            neutral: '😐 Neutral',
            negative: '😟 Negative'
          };
          doc.fontSize(10)
             .fillColor(textColor)
             .text(sentimentEmoji[summary.sentiment] || summary.sentiment);
          doc.moveDown(1);
        }

        // Topics Discussed
        if (summary.topics && summary.topics.length > 0) {
          addSection(doc, 'Topics Discussed', primaryColor);
          summary.topics.forEach(topic => {
            doc.fontSize(10)
               .fillColor(textColor)
               .text(`• ${topic}`, { indent: 20 });
          });
          doc.moveDown(1);
        }

        // Key Discussion Points
        if (summary.keyPoints && summary.keyPoints.length > 0) {
          addSection(doc, 'Key Discussion Points', primaryColor);
          summary.keyPoints.forEach((point, index) => {
            doc.fontSize(10)
               .fillColor(textColor)
               .text(`${index + 1}. ${point}`, { 
                 indent: 20,
                 align: 'justify',
                 lineGap: 2
               });
            doc.moveDown(0.3);
          });
          doc.moveDown(0.5);
        }

        // Decisions Made
        if (summary.decisions && summary.decisions.length > 0) {
          addSection(doc, 'Decisions Made', primaryColor);
          summary.decisions.forEach((decision, index) => {
            doc.fontSize(10)
               .fillColor(textColor)
               .text(`${index + 1}. ${decision}`, { 
                 indent: 20,
                 align: 'justify',
                 lineGap: 2
               });
            doc.moveDown(0.3);
          });
          doc.moveDown(0.5);
        }

        // Action Items
        if (summary.actionItems && summary.actionItems.length > 0) {
          addSection(doc, 'Action Items', primaryColor);
          
          summary.actionItems.forEach((item, index) => {
            // Check if we need a new page
            if (doc.y > 700) {
              doc.addPage();
            }

            doc.fontSize(10)
               .fillColor(textColor)
               .font('Helvetica-Bold')
               .text(`${index + 1}. ${item.title}`, { indent: 20 });

            doc.font('Helvetica');
            
            if (item.description) {
              doc.fontSize(9)
                 .fillColor(darkGray)
                 .text(item.description, { indent: 30, lineGap: 1 });
            }

            // Metadata
            doc.fontSize(8)
               .fillColor(lightGray);

            const metadata = [];
            if (item.assignee && item.assignee !== 'Unassigned') {
              metadata.push(`Assigned to: ${item.assignee}`);
            }
            if (item.priority) {
              metadata.push(`Priority: ${item.priority.toUpperCase()}`);
            }
            if (item.dueDate) {
              metadata.push(`Due: ${format(new Date(item.dueDate), 'MMM d, yyyy')}`);
            }
            if (item.status) {
              metadata.push(`Status: ${item.status}`);
            }

            if (metadata.length > 0) {
              doc.text(metadata.join(' • '), { indent: 30 });
            }

            doc.moveDown(0.5);
          });
          doc.moveDown(0.5);
        }

        // Next Steps
        if (summary.nextSteps && summary.nextSteps.length > 0) {
          addSection(doc, 'Next Steps', primaryColor);
          summary.nextSteps.forEach((step, index) => {
            doc.fontSize(10)
               .fillColor(textColor)
               .text(`${index + 1}. ${step}`, { 
                 indent: 20,
                 align: 'justify',
                 lineGap: 2
               });
            doc.moveDown(0.3);
          });
          doc.moveDown(0.5);
        }
      }

      // Transcript (if included and space permits)
      if (transcripts && transcripts.length > 0 && doc.y < 600) {
        doc.addPage();
        addSection(doc, 'Full Transcript', primaryColor);
        
        transcripts.forEach(transcript => {
          if (transcript.segments && transcript.segments.length > 0) {
            transcript.segments.forEach(segment => {
              // Check if we need a new page
              if (doc.y > 720) {
                doc.addPage();
              }

              const timestamp = formatTimestamp(segment.start);
              const speaker = transcript.userName || transcript.userId;

              doc.fontSize(9)
                 .fillColor(primaryColor)
                 .font('Helvetica-Bold')
                 .text(`[${timestamp}] ${speaker}:`, { continued: true })
                 .font('Helvetica')
                 .fillColor(textColor)
                 .text(` ${segment.text}`, { 
                   lineGap: 2,
                   align: 'justify'
                 });
              
              doc.moveDown(0.3);
            });
          }
        });
      }

      // ✅ FIXED: Footer on all pages
      const range = doc.bufferedPageRange();
      const pageCount = range.count;
      
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        doc.fontSize(8)
           .fillColor(lightGray)
           .text(
             `Generated by Smart Meeting Assistant • ${format(new Date(), 'MMM d, yyyy')}`,
             50,
             750,
             { align: 'center' }
           );
        
        doc.text(
          `Page ${i + 1} of ${pageCount}`,
          50,
          760,
          { align: 'center' }
        );
      }

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Helper function to add section headers
 */
function addSection(doc, title, color) {
  // Check if we need a new page
  if (doc.y > 700) {
    doc.addPage();
  }

  doc.fontSize(14)
     .fillColor(color)
     .font('Helvetica-Bold')
     .text(title);
  
  doc.moveDown(0.3);
  
  // Underline
  doc.moveTo(50, doc.y)
     .lineTo(200, doc.y)
     .strokeColor(color)
     .stroke();
  
  doc.moveDown(0.5);
  doc.font('Helvetica');
}

/**
 * Helper function to format timestamp
 */
function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports = {
  generateMeetingPDF
};