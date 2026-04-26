// frontend/src/components/ExportModal.jsx
import React, { useState } from 'react';
import {
  X,
  Download,
  FileText,
  File,
  Code,
  CheckCircle,
  Loader2
} from 'lucide-react';

const ExportModal = ({ meeting, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [includeTranscript, setIncludeTranscript] = useState(true);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      setSuccess(false);

      let url = '';
      let filename = '';

      switch (exportFormat) {
        case 'pdf':
          url = `http://localhost:4000/api/export/${meeting.meetingId}/pdf?includeTranscript=${includeTranscript}`;
          filename = `meeting-${meeting.meetingId}.pdf`;
          break;
        case 'json':
          url = `http://localhost:4000/api/export/${meeting.meetingId}/json?includeTranscript=${includeTranscript}`;
          filename = `meeting-${meeting.meetingId}.json`;
          break;
        case 'txt':
          url = `http://localhost:4000/api/export/${meeting.meetingId}/txt`;
          filename = `transcript-${meeting.meetingId}.txt`;
          break;
        default:
          throw new Error('Invalid export format');
      }

      // Download file
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Download className="w-6 h-6 text-purple-400" />
            Export Meeting
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-medium">Export successful!</span>
          </div>
        )}

        {/* Format Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Export Format
          </label>
          <div className="space-y-2">
            {/* PDF Option */}
            <button
              onClick={() => setExportFormat('pdf')}
              className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                exportFormat === 'pdf'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <FileText className={`w-5 h-5 ${exportFormat === 'pdf' ? 'text-purple-400' : 'text-slate-400'}`} />
              <div className="flex-1 text-left">
                <div className={`font-medium ${exportFormat === 'pdf' ? 'text-white' : 'text-slate-300'}`}>
                  PDF Document
                </div>
                <div className="text-xs text-slate-500">
                  Professional report with summary and transcript
                </div>
              </div>
              {exportFormat === 'pdf' && (
                <CheckCircle className="w-5 h-5 text-purple-400" />
              )}
            </button>

            {/* JSON Option */}
            <button
              onClick={() => setExportFormat('json')}
              className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                exportFormat === 'json'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <Code className={`w-5 h-5 ${exportFormat === 'json' ? 'text-purple-400' : 'text-slate-400'}`} />
              <div className="flex-1 text-left">
                <div className={`font-medium ${exportFormat === 'json' ? 'text-white' : 'text-slate-300'}`}>
                  JSON Data
                </div>
                <div className="text-xs text-slate-500">
                  Raw data for integration or analysis
                </div>
              </div>
              {exportFormat === 'json' && (
                <CheckCircle className="w-5 h-5 text-purple-400" />
              )}
            </button>

            {/* TXT Option */}
            <button
              onClick={() => setExportFormat('txt')}
              className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                exportFormat === 'txt'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-slate-700 hover:border-slate-600'
              }`}
            >
              <File className={`w-5 h-5 ${exportFormat === 'txt' ? 'text-purple-400' : 'text-slate-400'}`} />
              <div className="flex-1 text-left">
                <div className={`font-medium ${exportFormat === 'txt' ? 'text-white' : 'text-slate-300'}`}>
                  Plain Text
                </div>
                <div className="text-xs text-slate-500">
                  Simple transcript file
                </div>
              </div>
              {exportFormat === 'txt' && (
                <CheckCircle className="w-5 h-5 text-purple-400" />
              )}
            </button>
          </div>
        </div>

        {/* Options */}
        {(exportFormat === 'pdf' || exportFormat === 'json') && (
          <div className="mb-6">
            <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
              <input
                type="checkbox"
                checked={includeTranscript}
                onChange={(e) => setIncludeTranscript(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-purple-500 focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-white">Include Full Transcript</div>
                <div className="text-xs text-slate-500">
                  Add complete transcript with timestamps
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading || success}
            className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Downloaded
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;