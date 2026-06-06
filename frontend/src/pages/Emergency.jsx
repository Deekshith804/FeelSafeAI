// pages/Emergency.jsx - Upgraded: auto-escalation, real contacts, WhatsApp deep links
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Share2, ShieldAlert, Activity, Loader2, Search, UserPlus, Trash2, Check, Mic, MicOff, AlertTriangle } from 'lucide-react';
import SOSButton from '../components/SOSButton';
import SeverityPanel from '../components/SeverityPanel';
import { triggerEmergency, retryEmergency, analyzeThreat, getContacts, addContact, deleteContact } from '../services/api';
import { saveRecording } from '../utils/audioStorage';
import { universalVoiceEngine } from '../utils/voiceEngine';
import clsx from 'clsx';

const RISK_COLOR = { HIGH: '#FF3B5C', MEDIUM: '#FFC857', LOW: '#00FF9D' };

export default function Emergency() {
  const [isAlerting, setIsAlerting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [escalationLevel, setEscalationLevel] = useState(0);
  const [threatText, setThreatText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [escalationResult, setEscalationResult] = useState(null);
  let [contacts, setContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: 'Contact', medium_alert_enabled: true, high_alert_enabled: true });
  const [addingContact, setAddingContact] = useState(false);
  const [userLocation, setUserLocation] = useState({ lat: 28.6315, lon: 77.2167 }); // default Delhi CP
  const [recordingState, setRecordingState] = useState("idle");
  let [activeTrip, setActiveTrip] = useState(null);

  // Safety Guards
  const safeContacts = Array.isArray(contacts) ? contacts : [];
  const safeActiveTrip = activeTrip || null;

  // Speech Recognition state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [voiceMetadata, setVoiceMetadata] = useState(null);

  // Audio recording state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const audioRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const autoRecordTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const retryTimerRef = useRef(null);
  const recordingTimeoutRef = useRef(null);
  const audioStreamRef = useRef(null);

  useEffect(() => {
    loadContacts();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {}
      );
    }

    // Set up Voice engine cleanup on unmount
    return () => {
      universalVoiceEngine.stopListening();
      if (autoRecordTimerRef.current) clearTimeout(autoRecordTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const loadContacts = async () => {
    const res = await getContacts(1);
    if (res?.success) setContacts(res.contacts);
  };

  const handleSOS = () => {
    try {
      if (!contacts) contacts = [];
      if (!activeTrip) activeTrip = null;
      
      if (isAlerting) return; // only ONE active SOS flow at a time
      setIsAlerting(true);
      setCountdown(5);
      setEscalationLevel(1);
      setEscalationResult(null);

      let currentCount = 5;
      countdownTimerRef.current = setInterval(() => {
        currentCount -= 1;
        setCountdown(currentCount);
        if (currentCount <= 0) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          setCountdown(0);
          dispatchSOS(1);
        }
      }, 1000);
    } catch (err) {
      console.error("Error in handleSOS:", err);
      setIsAlerting(false);
    }
  };

  const dispatchSOS = async (level) => {
    try {
      setEscalationLevel(level);
      let res;
      const contactNums = (contacts || []).map(c => c.phone).filter(Boolean);
      if (level === 1) {
        res = await triggerEmergency(
          userLocation.lat, userLocation.lon,
          1, 'FeelSafe User', null, null, 'HIGH', 'SOS button pressed',
          { contact_numbers: contactNums }
        );
        if (res?.whatsapp_link) {
          window.open(res.whatsapp_link, '_blank');
        }
        // SOS flow rule: if HIGH risk (SOS is HIGH), start 30s recording *after* dispatch completes
        startRecordingAudio("SOS button pressed", 30);
      } else {
        res = await retryEmergency(
          userLocation.lat, userLocation.lon,
          level - 1, 1,
          contactNums
        );
      }
      setEscalationResult(res);

      if (res?.should_retry && res?.retry_in_seconds) {
        const nextLevel = level + 1;
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          dispatchSOS(nextLevel);
        }, res.retry_in_seconds * 1000);
      }
    } catch (err) {
      console.error(`SOS dispatch failed at level ${level}:`, err);
    }
  };

  const handleCancelAlert = () => {
    try {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setCountdown(0);

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      stopRecordingAudio();

      setIsAlerting(false);
      setEscalationLevel(0);
      setRecordingState("idle");
      setEscalationResult(null);
      setAnalysis(null);
      setThreatText('');
      if (autoRecordTimerRef.current) {
        clearTimeout(autoRecordTimerRef.current);
        autoRecordTimerRef.current = null;
      }
    } catch (err) {
      console.error("Error in handleCancelAlert:", err);
    }
  };

  const sendRecordingToContacts = async (audioRefId, transcriptText) => {
    try {
      const payload = {
        type: "EMERGENCY_AUDIO",
        message: "High risk emergency recorded audio attached",
        audio_reference_id: audioRefId,
        transcript: transcriptText,
        timestamp: new Date().toISOString()
      };
      const contactNums = (contacts || []).map(c => c.phone).filter(Boolean);
      const res = await triggerEmergency(
        userLocation.lat, userLocation.lon,
        1, 'FeelSafe User', null, null, 'HIGH', 'High risk emergency recorded audio attached',
        { ...payload, contact_numbers: contactNums }
      );
      console.log("Audio recording emergency alert dispatched:", res);
    } catch (err) {
      console.error("Failed to send emergency audio recording", err);
    }
  };

  const handleAnalyzeThreat = () => {
    handleAnalyzeThreatWithText(threatText, voiceMetadata);
  };

  const handleAnalyzeThreatWithText = async (textVal, metadata = null) => {
    if (!textVal.trim()) return;
    if (isAlerting) return;
    setIsAnalyzing(true);
    setAnalysis(null);
    setEscalationResult(null);
    try {
      const res = await analyzeThreat(textVal, userLocation.lat, userLocation.lon, 1, 'FeelSafe User', null, metadata);
      setAnalysis(res);
      const risk = res.risk_level || 'LOW';
      if (res?.auto_escalated && res?.escalation_result) {
        setEscalationResult(res.escalation_result);
        setIsAlerting(true);
        setEscalationLevel(res.escalation_result.escalation_level || 1);

        if (res.escalation_result?.should_retry && res.escalation_result?.retry_in_seconds) {
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          retryTimerRef.current = setTimeout(() => {
            dispatchSOS((res.escalation_result.escalation_level || 1) + 1);
          }, res.escalation_result.retry_in_seconds * 1000);
        }
      }

      if (risk === 'HIGH') {
        // Start audio recording immediately
        startRecordingAudio(textVal || "High threat auto-record", 30);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleVoiceInput = () => {
    if (!universalVoiceEngine.isSupported()) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isRecordingVoice) {
      universalVoiceEngine.stopListening();
      setIsRecordingVoice(false);
    } else {
      setSpeechError('');
      setIsRecordingVoice(true);
      universalVoiceEngine.startListening({
        lang: 'auto',
        continuous: false,
        onResult: (result) => {
          setThreatText(result.text);
          const meta = {
            text: result.text,
            language: result.language,
            source: 'voice'
          };
          setVoiceMetadata(meta);
          if (result.isFinal) {
            handleAnalyzeThreatWithText(result.text, meta);
          }
        },
        onError: (err) => {
          console.error(err);
          setSpeechError('Speech recognition failed. Please try typing.');
          setIsRecordingVoice(false);
        },
        onEnd: () => {
          setIsRecordingVoice(false);
        }
      });
    }
  };

  const startRecordingAudio = async (transcriptText, durationSeconds = 30) => {
    if (isRecordingAudio) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current);
          recordingTimeoutRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        const savedRec = saveRecording({
          blob: audioBlob,
          audio_blob_url: audioUrl,
          transcript: transcriptText || "",
          risk_level: "HIGH"
        });

        sendRecordingToContacts(savedRec.id, transcriptText || "");

        stream.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
        setIsRecordingAudio(false);
        setRecordingState("idle");
      };

      audioRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingAudio(true);
      setRecordingState("recording");

      recordingTimeoutRef.current = setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, durationSeconds * 1000);
    } catch (err) {
      console.error('Failed to record audio', err);
      setIsRecordingAudio(false);
      setRecordingState("idle");
    }
  };

  const stopRecordingAudio = () => {
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      audioRecorderRef.current.stop();
    }
  };

  const handleQuickEmergency = async (type, message) => {
    if (isAlerting) return;
    setThreatText(message);
    setIsAnalyzing(true);
    setAnalysis(null);
    setEscalationResult(null);
    try {
      const res = await analyzeThreat(message, userLocation.lat, userLocation.lon, 1, 'FeelSafe User');
      setAnalysis(res);
      const risk = res.risk_level || 'LOW';

      const confirmAlert = window.confirm("Send emergency alert?");
      if (confirmAlert) {
        setIsAlerting(true);
        setEscalationLevel(1);
        const contactNums = (contacts || []).map(c => c.phone).filter(Boolean);
        const emergencyRes = await triggerEmergency(
          userLocation.lat, userLocation.lon,
          1, 'FeelSafe User', null, null, risk === 'LOW' ? 'MEDIUM' : risk, `${type}: ${message}`,
          { contact_numbers: contactNums }
        );
        setEscalationResult(emergencyRes);
        if (emergencyRes?.whatsapp_link) {
          window.open(emergencyRes.whatsapp_link, '_blank');
        }
        if (risk === 'HIGH') {
          startRecordingAudio(`${type}: ${message}`, 30);
        }

        if (emergencyRes?.should_retry && emergencyRes?.retry_in_seconds) {
          if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          retryTimerRef.current = setTimeout(() => {
            dispatchSOS(2);
          }, emergencyRes.retry_in_seconds * 1000);
        }
      }
    } catch (err) {
      console.error(err);
      setIsAlerting(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) return;
    setAddingContact(true);
    try {
      const res = await addContact(newContact.name, newContact.phone, newContact.relation,
        newContact.medium_alert_enabled, newContact.high_alert_enabled, 1);
      if (res?.success) {
        await loadContacts();
        setNewContact({ name: '', phone: '', relation: 'Contact', medium_alert_enabled: true, high_alert_enabled: true });
        setShowAddContact(false);
      }
    } finally {
      setAddingContact(false);
    }
  };

  const handleDeleteContact = async (id) => {
    await deleteContact(id);
    loadContacts();
  };

  const riskLevel = analysis?.risk_level || 'LOW';
  const bgPulse   = riskLevel === 'HIGH';

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center p-6 md:p-12">
      {/* Background */}
      <div className={clsx('absolute inset-0 z-0 transition-opacity duration-1000 pointer-events-none',
        bgPulse ? 'bg-red-900/20 animate-pulse' : 'bg-transparent')} />
      <div className={clsx('absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full filter blur-[150px] z-0 pointer-events-none transition-all duration-1000',
        bgPulse ? 'bg-[#FF3B5C] opacity-20 animate-ping' : 'bg-[#FF3B5C] opacity-10')} />

      <div className="z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10 mt-6">

        {/* ── LEFT: SOS + Contacts ──────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-4 border border-[#FF3B5C]/50">
              <ShieldAlert className="w-10 h-10 text-[#FF3B5C]" />
            </motion.div>
            <h1 className="text-4xl font-black mb-1">EMERGENCY</h1>
            <p className="text-red-400 text-sm">Tap SOS to instantly alert contacts & authorities.</p>
          </div>

          <div className="relative flex flex-col items-center justify-center">
            {countdown > 0 ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-48 h-48 rounded-full border-4 border-dashed border-[#FF3B5C] flex flex-col items-center justify-center bg-red-950/20 animate-spin-slow mb-4"
              >
                <span className="text-5xl font-black text-[#FF3B5C]">{countdown}</span>
                <span className="text-xs font-bold text-red-400 mt-1 uppercase tracking-wider">Sending Alert</span>
              </motion.div>
            ) : (
              <div className="relative flex justify-center">
                <SOSButton onClick={handleSOS} isActivating={isAlerting && countdown === 0} />
              </div>
            )}

            {isAlerting && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCancelAlert}
                className="mt-4 px-6 py-3 bg-[#FF3B5C]/20 hover:bg-[#FF3B5C]/30 text-[#FF3B5C] border border-[#FF3B5C]/40 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,59,92,0.15)] z-30"
              >
                <AlertTriangle className="w-4 h-4 animate-pulse" />
                Cancel Alert
              </motion.button>
            )}

            {isAlerting && countdown === 0 && !escalationResult && (
              <div className="w-full glass p-4 rounded-2xl border border-[#FFC857]/40 bg-[#FFC857]/5 flex items-center justify-center gap-3 mt-4">
                <Loader2 className="w-5 h-5 text-[#FFC857] animate-spin" />
                <span className="font-bold text-sm text-[#FFC857]">Sending emergency alerts to contacts...</span>
              </div>
            )}
          </div>

          <div className="w-full max-w-sm flex justify-center">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => {
                const latVal = userLocation?.lat ?? 28.6315;
                const lonVal = userLocation?.lon ?? 77.2167;
                const link = `https://www.google.com/maps?q=${latVal},${lonVal}`;
                const msg  = encodeURIComponent(`HELP! I need assistance. My location: ${link}`);
                window.open(`https://wa.me/?text=${msg}`, '_blank');
              }}
              className="w-full flex flex-col items-center gap-2 bg-black/50 border border-gray-700 p-5 rounded-2xl hover:border-[#00E5FF] group">
              <div className="bg-[#00E5FF]/20 p-3 rounded-full group-hover:bg-[#00E5FF] transition-colors">
                <Share2 className="w-5 h-5 text-[#00E5FF] group-hover:text-black" />
              </div>
              <span className="font-bold text-sm">Share Live Location</span>
            </motion.button>
          </div>

          {/* Quick Emergency Action Buttons */}
          <div className="w-full max-w-sm space-y-2.5">
            <div className="text-xs text-gray-500 uppercase tracking-wider text-center font-bold">Quick Emergency Actions</div>
            <div className="grid grid-cols-3 gap-2">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickEmergency("Women Helpline", "I need women safety assistance")}
                className="p-3 bg-purple-950/20 hover:bg-purple-900/30 border border-purple-500/20 hover:border-purple-500/50 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-[11px] font-bold text-purple-200"
              >
                <span className="text-lg">👩‍✈️</span>
                <span>Women</span>
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickEmergency("Ambulance", "Medical emergency, immediate ambulance required")}
                className="p-3 bg-cyan-950/20 hover:bg-cyan-900/30 border border-cyan-500/20 hover:border-cyan-500/50 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-[11px] font-bold text-cyan-200"
              >
                <span className="text-lg">🚑</span>
                <span>Ambulance</span>
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickEmergency("Cyber Crime", "I am reporting a cyber fraud/scam incident")}
                className="p-3 bg-yellow-950/20 hover:bg-yellow-900/30 border border-yellow-500/20 hover:border-yellow-500/50 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-[11px] font-bold text-yellow-200"
              >
                <span className="text-lg">💻</span>
                <span>Cyber</span>
              </motion.button>
            </div>
          </div>

          {/* Auto-escalation result */}
          <AnimatePresence>
            {escalationResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="w-full glass p-4 rounded-2xl border border-[#FF3B5C]/40 bg-[#FF3B5C]/5">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-4 h-4 text-[#00FF9D]" />
                  <span className="font-bold text-sm">Alert Dispatched!</span>
                  <span className="ml-auto text-xs text-gray-400">Level {escalationResult?.escalation_level}</span>
                </div>
                <p className="text-xs text-gray-300 mb-3">{escalationResult?.escalation_message}</p>

                {/* Per-contact status grid */}
                {escalationResult?.results?.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {escalationResult.results.map((r, i) => (
                      <div key={i} className="bg-black/40 rounded-xl p-3 border border-gray-800">
                        <div className="font-bold text-xs text-white mb-2">{r.contact_name} · {r.number}</div>
                        <div className="flex flex-wrap gap-2">
                          {/* WhatsApp */}
                          {r.whatsapp_link && (
                            <a href={r.whatsapp_link} target="_blank" rel="noreferrer"
                              className="text-[10px] font-bold bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 px-2 py-0.5 rounded-full hover:bg-[#25D366]/30 transition-colors">
                              WhatsApp ↗
                            </a>
                          )}
                          {/* SMS */}
                          <span className={clsx(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            r.sms_status === 'delivered'
                              ? 'bg-[#00FF9D]/20 text-[#00FF9D] border-[#00FF9D]/30'
                              : (r.sms_status === 'queued' || r.sms_status === 'sent' || r.sms_status === 'sending')
                              ? 'bg-[#FFC857]/20 text-[#FFC857] border-[#FFC857]/30'
                              : r.sms_status === 'not_triggered'
                              ? 'bg-gray-800 text-gray-500 border-gray-700'
                              : 'bg-[#FF3B5C]/20 text-[#FF3B5C] border-[#FF3B5C]/30'
                          )}>
                            SMS: {
                              r.sms_status === 'delivered' ? '✓ Delivered' :
                              (r.sms_status === 'queued' || r.sms_status === 'sent' || r.sms_status === 'sending') ? '⏳ Pending' :
                              r.sms_status === 'not_triggered' ? '—' :
                              r.sms_sid ? '⏳ Pending' : '✗ Failed'
                            }
                          </span>
                          {/* Show SID if available */}
                          {r.sms_sid && (
                            <span className="text-[9px] text-gray-500 font-mono px-1">
                              SID: {r.sms_sid.slice(-8)}
                            </span>
                          )}
                          {/* Show error if failed */}
                          {r.sms_status === 'failed' && !r.sms_sid && (
                            <span className="text-[9px] text-[#FF3B5C] px-1 break-all">
                              {r.is_trial_error
                                ? '⚠️ Trial: Number not verified in Twilio'
                                : r.sms_error ? r.sms_error.substring(0, 60) : 'Send failed'}
                            </span>
                          )}
                          {/* Voice Call */}
                          <span className={clsx(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            r.call_status === 'initiated'
                              ? 'bg-[#7C4DFF]/20 text-[#7C4DFF] border-[#7C4DFF]/30'
                              : r.call_status === 'not_triggered'
                              ? 'bg-gray-800 text-gray-500 border-gray-700'
                              : 'bg-[#FF3B5C]/20 text-[#FF3B5C] border-[#FF3B5C]/30'
                          )}>
                            Call: {r.call_status === 'not_triggered' ? '—' : r.call_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary badges */}
                <div className="flex flex-wrap gap-2">
                  {escalationResult?.results?.some(r => r.sms_status === 'delivered') && (
                    <span className="text-[10px] font-bold bg-[#00FF9D]/10 text-[#00FF9D] border border-[#00FF9D]/20 px-2 py-0.5 rounded-full">
                      ✓ SMS Delivered
                    </span>
                  )}
                  {escalationResult?.results?.some(r => r.sms_sid && r.sms_status !== 'delivered' && r.sms_status !== 'failed') && (
                    <span className="text-[10px] font-bold bg-[#FFC857]/10 text-[#FFC857] border border-[#FFC857]/20 px-2 py-0.5 rounded-full">
                      ⏳ SMS Queued (in transit)
                    </span>
                  )}
                  {escalationResult?.results?.some(r => r.sms_status === 'failed' && !r.sms_sid) && (
                    <span className="text-[10px] font-bold bg-[#FF3B5C]/10 text-[#FF3B5C] border border-[#FF3B5C]/20 px-2 py-0.5 rounded-full">
                      ✗ SMS Failed
                    </span>
                  )}
                  {escalationResult?.twilio_call_triggered && (
                    <span className="text-[10px] font-bold bg-[#7C4DFF]/10 text-[#7C4DFF] border border-[#7C4DFF]/20 px-2 py-0.5 rounded-full">
                      📞 Voice Call Initiated
                    </span>
                  )}
                  <span className="text-[10px] font-bold bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 px-2 py-0.5 rounded-full">
                    WhatsApp Available
                  </span>
                </div>

                {/* Twilio Trial Account Warning */}
                {escalationResult?.results?.some(r => r.is_trial_error) && (
                  <div className="mt-3 p-3 bg-yellow-950/40 border border-yellow-500/40 rounded-xl text-xs">
                    <div className="font-bold text-yellow-300 mb-1">⚠️ Twilio Trial Account Detected</div>
                    <p className="text-yellow-200/80 mb-2">
                      SMS failed because your Twilio account is in trial mode and the destination numbers are not verified.
                    </p>
                    <p className="text-yellow-200/70">
                      To fix this, either:
                    </p>
                    <ul className="text-yellow-200/70 list-disc list-inside mt-1 space-y-0.5">
                      <li>Upgrade your Twilio account (recommended for production)</li>
                      <li>Verify each contact number at{' '}
                        <a href="https://twilio.com/user/account/phone-numbers/verified" target="_blank" rel="noreferrer"
                          className="text-yellow-300 underline hover:text-yellow-100">
                          twilio.com → Verified Callers
                        </a>
                      </li>
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>


          {/* Emergency Contacts */}
          <div className="w-full glass p-4 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-sm">Emergency Contacts ({safeContacts.length})</h3>
              <button onClick={() => setShowAddContact(v => !v)}
                className="flex items-center gap-1 text-xs text-[#00E5FF] hover:text-white">
                <UserPlus className="w-3 h-3" /> Add
              </button>
            </div>

            <AnimatePresence>
              {showAddContact && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
                  <div className="space-y-2">
                    {['name', 'phone', 'relation'].map(f => (
                      <input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                        value={newContact[f]} onChange={e => setNewContact(p => ({ ...p, [f]: e.target.value }))}
                        className="w-full bg-black/50 border border-gray-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[#00E5FF]" />
                    ))}
                    <div className="flex gap-2">
                      {[['medium_alert_enabled', 'MEDIUM'], ['high_alert_enabled', 'HIGH']].map(([key, label]) => (
                        <button key={key} onClick={() => setNewContact(p => ({ ...p, [key]: !p[key] }))}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold border transition-colors ${
                            newContact[key]
                              ? label === 'HIGH' ? 'bg-[#FF3B5C] border-[#FF3B5C] text-white' : 'bg-[#FFC857] border-[#FFC857] text-black'
                              : 'bg-transparent border-gray-700 text-gray-500'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <button onClick={handleAddContact} disabled={addingContact}
                      className="w-full py-2 bg-[#00E5FF] text-black rounded-lg text-sm font-bold disabled:opacity-50">
                      {addingContact ? 'Saving...' : 'Save Contact'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              {safeContacts.length === 0 && <p className="text-xs text-gray-500 text-center py-2">No contacts yet.</p>}
              {safeContacts.map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 bg-black/30 rounded-xl border border-gray-800">
                  <div>
                    <div className="font-bold text-sm">{c.name}</div>
                    <div className="text-xs text-gray-400">{c.phone} · {c.relation}</div>
                    <div className="flex gap-1 mt-1">
                      {c.medium_alert_enabled ? <span className="text-[9px] bg-[#FFC857]/20 text-[#FFC857] px-1.5 py-0.5 rounded-full">MED</span> : null}
                      {c.high_alert_enabled ? <span className="text-[9px] bg-[#FF3B5C]/20 text-[#FF3B5C] px-1.5 py-0.5 rounded-full">HIGH</span> : null}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteContact(c.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Threat Analysis ────────────────────────────────────────── */}
        <div className="w-full">
          <div className={clsx('glass p-6 rounded-3xl border transition-all duration-500',
            riskLevel === 'HIGH' ? 'border-[#FF3B5C]/80 shadow-[0_0_30px_rgba(255,59,92,0.25)]' : 'border-[#00E5FF]/30')}>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Activity className={clsx('w-6 h-6', riskLevel === 'HIGH' ? 'text-[#FF3B5C]' : 'text-[#00E5FF]')} />
                AI Threat Analysis
              </h2>
              <button 
                onClick={toggleVoiceInput}
                className={`p-2 rounded-full flex items-center justify-center transition-all ${
                  isRecordingVoice ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
                title={isRecordingVoice ? 'Recording voice... Click to stop' : 'Use Voice Input'}
              >
                {isRecordingVoice ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-5">
              {isRecordingVoice ? "Listening... Speak now..." : "Describe your situation. AI analyzes and auto-alerts contacts if needed."}
            </p>

            <div className="flex flex-col gap-3 mb-5">
              <textarea value={threatText} onChange={e => setThreatText(e.target.value)} rows={4}
                placeholder={isRecordingVoice ? "Speak now..." : 'Describe the situation...\ne.g. "Someone is following me on the street"'}
                className={clsx('w-full bg-black/50 border rounded-xl py-3 px-4 text-white focus:outline-none resize-none transition-colors',
                  riskLevel === 'HIGH' ? 'border-[#FF3B5C]/50 focus:border-[#FF3B5C]' : 'border-gray-700 focus:border-[#00E5FF]')} />
              {speechError && <div className="text-xs text-red-400">{speechError}</div>}
              <button onClick={handleAnalyzeThreat} disabled={isAnalyzing || !threatText.trim()}
                className={clsx('w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors',
                  riskLevel === 'HIGH' ? 'bg-gradient-to-r from-[#FF3B5C] to-red-600 text-white' : 'bg-[#00E5FF] text-black hover:bg-[#00FF9D]')}>
                {isAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Search className="w-5 h-5" /> Analyze Threat</>}
              </button>
            </div>

            {/* Audio Recording active banner */}
            {isRecordingAudio && (
              <div className="p-4 mb-4 bg-red-950/40 border border-red-500/30 rounded-2xl flex items-center justify-between text-xs animate-pulse">
                <span className="text-red-400 font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                  Audio Recording Active
                </span>
                <button 
                  onClick={stopRecordingAudio}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
                >
                  Stop Recording
                </button>
              </div>
            )}


            <AnimatePresence>
              {analysis && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className={clsx('p-5 rounded-2xl border',
                    riskLevel === 'HIGH' ? 'bg-[#FF3B5C]/10 border-[#FF3B5C] shadow-[0_0_15px_rgba(255,59,92,0.4)]' :
                    riskLevel === 'MEDIUM' ? 'bg-[#FFC857]/10 border-[#FFC857]/50' :
                    'bg-[#00FF9D]/10 border-[#00FF9D]/50')}>
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                    <span className="text-sm text-gray-400 uppercase">Risk Level</span>
                    <span className={clsx('font-black text-2xl px-4 py-1 rounded-full uppercase',
                      riskLevel === 'HIGH' ? 'bg-[#FF3B5C] text-white animate-pulse' :
                      riskLevel === 'MEDIUM' ? 'bg-[#FFC857]/20 text-[#FFC857]' : 'bg-[#00FF9D]/20 text-[#00FF9D]')}>
                      {riskLevel}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Threat Score</span>
                      <div className="flex items-center gap-3">
                        <div className="w-28 h-2 bg-black/50 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${analysis?.score ?? 0}%` }}
                            className="h-full" style={{ background: RISK_COLOR[riskLevel] }} />
                        </div>
                        <span className="font-bold text-white w-6 text-right">{analysis?.score ?? 0}</span>
                      </div>
                    </div>
                    {analysis?.auto_escalated && (
                      <div className="p-2 rounded-lg bg-[#FFC857]/10 border border-[#FFC857]/30 text-xs text-[#FFC857] font-bold">
                        Auto-escalated to {escalationResult?.contacts_count ?? 0} contact(s)
                      </div>
                    )}
                    {analysis?.message && (
                      <div className="mt-2 pt-3 border-t border-white/10">
                        <span className="text-gray-400 text-xs block mb-1">AI Response</span>
                        <p className="text-sm text-white">{analysis.message}</p>
                      </div>
                    )}
                    {analysis?.action_tips?.length > 0 && (
                      <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                        {analysis.action_tips.slice(0, 3).map((tip, i) => <li key={i}>{tip}</li>)}
                      </ul>
                    )}

                    {/* Government Guidance Layer */}
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-3 text-left">
                      <div className="text-xs font-bold text-[#00E5FF] uppercase tracking-wider">
                        🏛️ AI Government Guidance & Safety Navigator
                      </div>
                      
                      <div className="text-xs text-gray-300 bg-white/5 p-3 rounded-xl border border-white/5">
                        {riskLevel === 'LOW' && (
                          <p>💡 <strong>LOW Risk Protocol:</strong> Guidance only. Your emergency contacts have <strong>NOT</strong> been alerted. Please follow safety guidance below.</p>
                        )}
                        {riskLevel === 'MEDIUM' && (
                          <p>⚠️ <strong>MEDIUM Risk Protocol:</strong> Guidance + Contact Notification. Emergency contacts are being notified via WhatsApp/SMS fallback where necessary. Review guidance below.</p>
                        )}
                        {riskLevel === 'HIGH' && (
                          <p>🚨 <strong>HIGH Risk Protocol:</strong> Full SOS Escalation! Real-time Twilio SMS alerts have been dispatched. Voice call backup and authorities notifications are active.</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 bg-black/40 border border-gray-800 rounded-xl">
                          <span className="text-red-400 font-bold block">🚨 Police Helpline</span>
                          <span className="text-white">Call 112 / 100 for dispatch</span>
                        </div>
                        <div className="p-2 bg-black/40 border border-gray-800 rounded-xl">
                          <span className="text-purple-400 font-bold block">👩 Women Helpline</span>
                          <span className="text-white">Call 1091 / 181 for safety</span>
                        </div>
                        <div className="p-2 bg-black/40 border border-gray-800 rounded-xl col-span-2">
                          <span className="text-yellow-400 font-bold block">💻 Cybercrime Assistance</span>
                          <span className="text-white">Report cyber fraud at <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" className="text-[#00E5FF] underline">cybercrime.gov.in</a></span>
                        </div>
                        <div className="p-2 bg-black/40 border border-gray-800 rounded-xl col-span-2">
                          <span className="text-cyan-400 font-bold block">🚑 Ambulance & Medical Support</span>
                          <span className="text-white">Call 108 / 102 for immediate dispatch</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6">
            <SeverityPanel 
              text={threatText} 
              lat={userLocation?.lat ?? 28.6315} 
              lon={userLocation?.lon ?? 77.2167} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
