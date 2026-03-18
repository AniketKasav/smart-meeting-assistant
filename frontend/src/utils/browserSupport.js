// frontend/src/utils/browserSupport.js

/**
 * Check if the browser supports Web Speech API
 * @returns {Object} Support status and details
 */
export const checkSpeechRecognitionSupport = () => {
  const hasWebkitSpeechRecognition = 'webkitSpeechRecognition' in window;
  const hasSpeechRecognition = 'SpeechRecognition' in window;
  
  return {
    isSupported: hasWebkitSpeechRecognition || hasSpeechRecognition,
    api: hasWebkitSpeechRecognition ? 'webkit' : hasSpeechRecognition ? 'standard' : null,
    browser: getBrowserInfo()
  };
};

/**
 * Get browser information
 * @returns {Object} Browser name and version
 */
const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';

  if (userAgent.indexOf('Chrome') > -1) {
    browserName = 'Chrome';
    browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
  } else if (userAgent.indexOf('Safari') > -1) {
    browserName = 'Safari';
    browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
  } else if (userAgent.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
    browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
  } else if (userAgent.indexOf('Edge') > -1) {
    browserName = 'Edge';
    browserVersion = userAgent.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
  }

  return { name: browserName, version: browserVersion };
};

/**
 * Request microphone permission
 * @returns {Promise<boolean>} Permission granted status
 */
export const requestMicrophonePermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately, we just needed permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    return false;
  }
};

/**
 * Check if microphone permission is already granted
 * @returns {Promise<string>} Permission state: 'granted', 'denied', 'prompt'
 */
export const checkMicrophonePermission = async () => {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' });
    return result.state; // 'granted', 'denied', or 'prompt'
  } catch (error) {
    console.error('Permission check failed:', error);
    return 'unknown';
  }
};

/**
 * Get supported speech recognition languages
 * @returns {Array<string>} List of supported language codes
 */
export const getSupportedLanguages = () => {
  // Common supported languages by Web Speech API
  return [
    { code: 'en-US', name: 'English (United States)' },
    { code: 'en-GB', name: 'English (United Kingdom)' },
    { code: 'hi-IN', name: 'Hindi (India)' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'de-DE', name: 'German (Germany)' },
    { code: 'ja-JP', name: 'Japanese (Japan)' },
    { code: 'zh-CN', name: 'Chinese (Mandarin)' },
  ];
};

/**
 * Test if speech recognition works
 * @returns {Promise<boolean>} Test result
 */
export const testSpeechRecognition = () => {
  return new Promise((resolve) => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.onstart = () => {
        recognition.stop();
        resolve(true);
      };
      
      recognition.onerror = () => {
        resolve(false);
      };
      
      recognition.start();
      
      // Timeout after 3 seconds
      setTimeout(() => {
        recognition.stop();
        resolve(false);
      }, 3000);
    } catch (error) {
      resolve(false);
    }
  });
};