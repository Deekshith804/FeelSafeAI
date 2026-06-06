/**
 * src/utils/voiceEngine.js
 * Universal Multilingual Voice-to-Text Processing Engine for FeelSafe.
 * Provides automatic spoken language detection (English, Hindi, Kannada, Tamil, etc.),
 * transcribes speech in its native tongue, and exposes a clean interface.
 */

// Heuristic keyword banks for Romanized/Phonetic Indian languages
const ROMANIZED_KEYWORDS = {
  hi: [
    "madad", "bachao", "bachaoo", "chori", "police", "pulis", "hamla", "chaku", "goli", "khoon", "dard",
    "murdar", "dhamki", "aspatal", "accident", "hadsa", "ghabrahat", "paise", "hacker", "scam"
  ],
  kn: [
    "sahaya", "sahaaya", "kapadi", "kaapaadi", "kallatana", "daali", "ayudha", "aayudha", "chaku", "kole",
    "raktha", "novu", "noavu", "aspatre", "accident", "anahuta", "bhayavagide", "hana", "anchal"
  ],
  ta: [
    "uthavi", "udhavi", "kaapathi", "kaapathu", "thiruttu", "dhaali", "aayudham", "kaththi", "kolai",
    "raththam", "vali", "aspathiri", "vibathu", "bayam", "panam"
  ]
};

/**
 * Heuristic detector for script characters and romanized keywords
 * Returns { language, confidence }
 */
export function detectTextLanguage(text) {
  if (!text) return { language: 'en', confidence: 1.0 };

  const cleanText = text.trim().toLowerCase();
  
  let hiScriptCount = 0;
  let knScriptCount = 0;
  let taScriptCount = 0;
  let enCharCount = 0;
  
  for (let i = 0; i < cleanText.length; i++) {
    const charCode = cleanText.charCodeAt(i);
    // Devanagari (Hindi): 0900-097F
    if (charCode >= 0x0900 && charCode <= 0x097F) {
      hiScriptCount++;
    }
    // Kannada: 0C80-0CFF
    else if (charCode >= 0x0C80 && charCode <= 0x0CFF) {
      knScriptCount++;
    }
    // Tamil: 0B80-0BFF
    else if (charCode >= 0x0B80 && charCode <= 0x0BFF) {
      taScriptCount++;
    }
    // Latin / English alphabetical
    else if ((charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122)) {
      enCharCount++;
    }
  }
  
  const totalScriptChars = hiScriptCount + knScriptCount + taScriptCount + enCharCount;
  
  // 1. Script-level detection (if user spoke in native script)
  if (totalScriptChars > 0) {
    if (hiScriptCount / totalScriptChars > 0.25) {
      return { language: 'hi', confidence: Math.round((hiScriptCount / totalScriptChars) * 100) / 100 };
    }
    if (knScriptCount / totalScriptChars > 0.25) {
      return { language: 'kn', confidence: Math.round((knScriptCount / totalScriptChars) * 100) / 100 };
    }
    if (taScriptCount / totalScriptChars > 0.25) {
      return { language: 'ta', confidence: Math.round((taScriptCount / totalScriptChars) * 100) / 100 };
    }
  }

  // 2. Romanized keyword-level detection (if transcribed as Latin script but spoken phonetically)
  if (enCharCount > 0) {
    const words = cleanText.split(/\s+/);
    let hiScore = 0;
    let knScore = 0;
    let taScore = 0;

    words.forEach(word => {
      // Check word prefix/suffix matching to be lenient
      if (ROMANIZED_KEYWORDS.hi.some(kw => word.includes(kw) || kw.includes(word))) hiScore++;
      if (ROMANIZED_KEYWORDS.kn.some(kw => word.includes(kw) || kw.includes(word))) knScore++;
      if (ROMANIZED_KEYWORDS.ta.some(kw => word.includes(kw) || kw.includes(word))) taScore++;
    });

    const maxScore = Math.max(hiScore, knScore, taScore);
    if (maxScore > 0) {
      const confidence = Math.min(0.85, 0.4 + maxScore * 0.15);
      if (maxScore === hiScore) return { language: 'hi', confidence };
      if (maxScore === knScore) return { language: 'kn', confidence };
      if (maxScore === taScore) return { language: 'ta', confidence };
    }
  }

  // 3. Fallback to current browser language or English
  const defaultLang = localStorage.getItem('nav_lang') || 'en';
  return { language: defaultLang, confidence: 0.6 };
}

/**
 * Universal Voice Engine wrapper for Web Speech API
 */
export class UniversalVoiceEngine {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onEndCallback = null;
  }

  isSupported() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return !!SpeechRecognition;
  }

  /**
   * Starts listening to user voice input
   * @param {Object} options 
   * @param {Function} options.onResult - Called with { text, language, confidence }
   * @param {Function} options.onError - Called with error
   * @param {Function} options.onEnd - Called when listening ends
   * @param {string} options.lang - 'auto' | 'en' | 'hi' | 'kn' | 'ta'
   * @param {boolean} options.continuous - Keep listening until stopped
   */
  startListening(options = {}) {
    if (!this.isSupported()) {
      if (options.onError) {
        options.onError(new Error("Web Speech API is unsupported in this browser."));
      }
      return;
    }

    if (this.isListening) {
      this.stopListening();
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = options.continuous ?? false;
    this.recognition.interimResults = true; // Enabled interim results for real-time visual feedback

    // Map language parameter to exact locale codes
    let configLang = options.lang || 'auto';
    if (configLang === 'auto') {
      configLang = localStorage.getItem('nav_lang') || 'en';
    }

    // Set engine language locale
    switch (configLang) {
      case 'hi':
        this.recognition.lang = 'hi-IN';
        break;
      case 'kn':
        this.recognition.lang = 'kn-IN';
        break;
      case 'ta':
        this.recognition.lang = 'ta-IN';
        break;
      case 'en':
      default:
        this.recognition.lang = 'en-IN';
        break;
    }

    this.onResultCallback = options.onResult;
    this.onErrorCallback = options.onError;
    this.onEndCallback = options.onEnd;
    this.isListening = true;

    // Accumulated final text
    let finalTranscript = '';

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptSegment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptSegment;
        } else {
          interimTranscript += transcriptSegment;
        }
      }

      const activeText = finalTranscript || interimTranscript;
      
      if (activeText.trim() && this.onResultCallback) {
        // Run real-time language detection
        const { language, confidence } = detectTextLanguage(activeText);
        this.onResultCallback({
          text: activeText,
          language,
          confidence,
          isFinal: event.results[event.results.length - 1].isFinal
        });
      }
    };

    this.recognition.onerror = (event) => {
      console.error("[VoiceEngine] Speech recognition error:", event.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(event);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };

    try {
      this.recognition.start();
    } catch (err) {
      console.error("[VoiceEngine] Failed to start recognition:", err);
      if (this.onErrorCallback) {
        this.onErrorCallback(err);
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn("[VoiceEngine] Error stopping recognition:", err);
      }
    }
    this.isListening = false;
  }
}

// Single singleton instance for application-wide voice engine
export const universalVoiceEngine = new UniversalVoiceEngine();
