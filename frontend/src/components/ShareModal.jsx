// frontend/src/components/ShareModal.jsx
import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Lock,
  Clock,
  Link as LinkIcon,
  Mail,
  Loader2
} from 'lucide-react';

const ShareModal = ({ meeting, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [expiresIn, setExpiresIn] = useState('24'); // hours

  const generateShareLink = async () => {
    try {
      setLoading(true);

      const response = await fetch(`http://localhost:4000/api/export/${meeting._id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: usePassword ? password : null,
          expiresIn: expiresIn
        })
      });

      const data = await response.json();

      if (data.success) {
        setShareLink(data.data.shareLink);
      } else {
        alert('Failed to generate share link');
      }

    } catch (error) {
      console.error('Share link error:', error);
      alert('Failed to generate share link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy error:', error);
      alert('Failed to copy link');
    }
  };

  const shareSummary = async () => {
    if (!meeting.summary) {
      alert('No summary available to share');
      return;
    }

    const summaryText = `
Meeting: ${meeting.title}
Date: ${new Date(meeting.startedAt).toLocaleDateString()}

Executive Summary:
${meeting.summary.text || meeting.summary.executiveSummary || 'No summary available'}

Key Points:
${meeting.summary.keyPoints ? meeting.summary.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n') : 'None'}

Action Items:
${meeting.summary.actionItems ? meeting.summary.actionItems.map((item, i) => 
  `${i + 1}. ${item.title} (${item.assignee || 'Unassigned'})`
).join('\n') : 'None'}
    `.trim();

    try {
      await navigator.clipboard.writeText(summaryText);
      alert('Summary copied to clipboard!');
    } catch (error) {
      console.error('Copy error:', error);
      alert('Failed to copy summary');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Share2 className="w-6 h-6 text-purple-400" />
            Share Meeting
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 space-y-3">
          <button
            onClick={shareSummary}
            className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-3 text-left"
          >
            <Copy className="w-5 h-5 text-blue-400" />
            <div className="flex-1">
              <div className="font-medium text-white">Copy Summary</div>
              <div className="text-xs text-slate-500">Copy summary text to clipboard</div>
            </div>
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <LinkIcon className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">Generate Share Link</span>
          </div>

          {/* Share Link Options */}
          {!shareLink ? (
            <div className="space-y-4">
              {/* Password Protection */}
              <label className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
                <input
                  type="checkbox"
                  checked={usePassword}
                  onChange={(e) => setUsePassword(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 text-purple-500 focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-white mb-1">
                    <Lock className="w-4 h-4 text-yellow-400" />
                    Password Protection
                  </div>
                  {usePassword && (
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="mt-2 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  )}
                </div>
              </label>

              {/* Expiration */}
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-white mb-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Link Expiration
                </div>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  <option value="24">24 hours</option>
                  <option value="72">3 days</option>
                  <option value="168">1 week</option>
                  <option value="720">30 days</option>
                  <option value="">Never expires</option>
                </select>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateShareLink}
                disabled={loading || (usePassword && !password)}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Generate Share Link
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Share Link Display */
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <div className="text-xs text-slate-500 mb-2">Share Link:</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {usePassword && password && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    <Lock className="w-4 h-4" />
                    <span className="font-medium">Password: {password}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Share this password separately with recipients
                  </p>
                </div>
              )}

              {expiresIn && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-400 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Expires in {expiresIn} hours</span>
                  </div>
                </div>
              )}

              {/* Generate New Link */}
              <button
                onClick={() => {
                  setShareLink('');
                  setCopied(false);
                }}
                className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
              >
                Generate New Link
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ShareModal;