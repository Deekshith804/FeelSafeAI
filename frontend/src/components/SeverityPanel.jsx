import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Volume2, MapPin, Sparkles, Sliders, CheckCircle } from 'lucide-react';
import { analyzeSeverity } from '../services/api';

export default function SeverityPanel({ text, lat, lon, onSeverityCalculated }) {
  const [pitch, setPitch] = useState(160);
  const [speechRate, setSpeechRate] = useState(120);
  const [urgencyTone, setUrgencyTone] = useState(0.3);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  const performAnalysis = async () => {
    setLoading(true);
    try {
      const voice = { pitch, speech_rate: speechRate, urgency_tone: urgencyTone };
      const res = await analyzeSeverity(text || "Help needed", lat, lon, voice, 1);
      if (res.success) {
        setResult(res);
        if (onSeverityCalculated) {
          onSeverityCalculated(res.severity, res.fused_score);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (text) {
      performAnalysis();
    }
  }, [text, pitch, speechRate, urgencyTone, lat, lon]);

  const getSeverityColor = (sev) => {
    if (sev === 'HIGH') return 'from-[#FF3B5C] to-red-600 text-white border-red-500/40';
    if (sev === 'MEDIUM') return 'from-[#FFC857] to-amber-600 text-white border-amber-500/40';
    return 'from-[#00FF9D] to-emerald-600 text-[#0B1020] border-emerald-500/40';
  };

  const getMeterColor = (score) => {
    if (score >= 7.0) return 'bg-[#FF3B5C]';
    if (score >= 4.0) return 'bg-[#FFC857]';
    return 'bg-[#00FF9D]';
  };

  return (
    <div className="glass rounded-3xl p-6 border border-white/10 relative overflow-hidden space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#00E5FF] animate-pulse" />
          AI Threat Severity Fusion
        </h3>
        <button 
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full glass hover:bg-white/10 transition-colors"
        >
          <Sliders className="w-3.5 h-3.5" />
          {showConfig ? 'Hide Controls' : 'Voice Stress Inputs'}
        </button>
      </div>

      {showConfig && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-black/30 rounded-2xl border border-white/5 space-y-4 text-sm"
        >
          <div className="font-semibold text-[#00E5FF] flex items-center gap-1.5">
            <Volume2 className="w-4 h-4" /> Customize Mock Vocal Indicators
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Vocal Pitch (80 - 300 Hz)</span>
                <span className="text-white font-mono">{pitch} Hz</span>
              </div>
              <input 
                type="range" min="80" max="300" value={pitch} 
                onChange={(e) => setPitch(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
              />
              <span className="text-[10px] text-gray-500">Fear/urgency increases pitch values above 230Hz</span>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Speech Rate (60 - 220 words/min)</span>
                <span className="text-white font-mono">{speechRate} WPM</span>
              </div>
              <input 
                type="range" min="60" max="220" value={speechRate} 
                onChange={(e) => setSpeechRate(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
              />
              <span className="text-[10px] text-gray-500">Panic triggers rapid speech (&gt;170) or shock stutters (&lt;70)</span>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Urgency Tone Index (0.0 - 1.0)</span>
                <span className="text-white font-mono">{urgencyTone.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.05" value={urgencyTone} 
                onChange={(e) => setUrgencyTone(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
              />
            </div>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-6 space-y-2">
          <div className="w-8 h-8 border-4 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Fusing sensors...</span>
        </div>
      ) : result ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-2xl bg-gradient-to-br border font-bold text-sm tracking-wider ${getSeverityColor(result.severity)}`}>
              {result.severity} SEVERITY
            </div>
            
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-gray-400">
                <span>Fusion Risk Index</span>
                <span>{result.fused_score} / 10</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${getMeterColor(result.fused_score)}`} 
                  style={{ width: `${result.fused_score * 10}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl space-y-3 text-xs">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#00FF9D] mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-white">Explainable Reasoning: </span>
                <span className="text-gray-300">{result.explanation}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center">
              <div>
                <div className="text-gray-500 font-medium">Text Urgency</div>
                <div className="text-[#00E5FF] font-bold mt-0.5">{result.text_urgency_score} / 10</div>
              </div>
              <div>
                <div className="text-gray-500 font-medium">Vocal Stress</div>
                <div className="text-[#7C4DFF] font-bold mt-0.5">{result.voice_stress_score} / 3.0</div>
              </div>
              <div>
                <div className="text-gray-500 font-medium">Location Risk</div>
                <div className="text-[#FFC857] font-bold mt-0.5">{result.gps_risk_score} / 3.0</div>
              </div>
            </div>
          </div>

          {result.false_alarm_suppressed && (
            <div className="flex items-center gap-2 text-xs font-bold text-[#00FF9D] bg-[#00FF9D]/10 p-2.5 rounded-xl border border-[#00FF9D]/20">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>False Alarm suppressed using your vocal/text baseline behaviors.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-sm text-gray-500 flex flex-col items-center justify-center gap-2">
          <ShieldAlert className="w-8 h-8 opacity-40 text-[#00E5FF]" />
          <span>Type threat text or trigger SOS to calculate severity level.</span>
        </div>
      )}
    </div>
  );
}
