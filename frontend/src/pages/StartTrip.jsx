// pages/StartTrip.jsx
// THE main trip page — 3-step unified flow with FeedbackModal + EscalationModal
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Navigation, Square, Loader2,
  BrainCircuit, AlertTriangle, ChevronRight, Shield, Clock, TrendingDown,
  Mic, MicOff
} from 'lucide-react';
import MapView from '../components/MapView';
import FeedbackModal from '../components/FeedbackModal';
import EscalationModal from '../components/EscalationModal';
import { getSafestRoute, startTrip, endTrip, analyzeThreat, geocodeLocation, triggerEmergency, getContacts } from '../services/api';
import { processRoute, DELHI_SAFETY_POIS, detectPOIsForRoute } from '../utils/routeEngine';
import { saveRecording } from '../utils/audioStorage';

const STEP = { INPUT: 'INPUT', ROUTES: 'ROUTES', TRACKING: 'TRACKING', ENDED: 'ENDED' };
const RISK_COLOR = { LOW: '#00FF9D', MEDIUM: '#FFC857', HIGH: '#FF3B5C' };
const scoreColor = s => s >= 65 ? '#00FF9D' : s >= 40 ? '#FFC857' : '#FF3B5C';

const DELHI_AREAS = {
  "Connaught Place": { lat: 28.6315, lon: 77.2167, name: "Connaught Place, Delhi" },
  "Karol Bagh": { lat: 28.6519, lon: 77.1909, name: "Karol Bagh, Delhi" },
  "Saket": { lat: 28.5200, lon: 77.2070, name: "Saket, Delhi" },
  "Lajpat Nagar": { lat: 28.5677, lon: 77.2433, name: "Lajpat Nagar, Delhi" },
  "Dwarka": { lat: 28.5820, lon: 77.0490, name: "Dwarka, Delhi" },
  "Noida border points": { lat: 28.5355, lon: 77.3910, name: "Noida border points, Delhi" },
  "AIIMS Delhi": { lat: 28.5672, lon: 77.2100, name: "AIIMS Delhi, Delhi" },
  "Chandni Chowk": { lat: 28.6560, lon: 77.2300, name: "Chandni Chowk, Delhi" },
  "Rajouri Garden": { lat: 28.6415, lon: 77.1248, name: "Rajouri Garden, Delhi" }
};

const CITY_DATA = {
  Delhi: {
    srcName: "Connaught Place",
    dstName: "Lajpat Nagar",
    srcPoint: DELHI_AREAS["Connaught Place"],
    dstPoint: DELHI_AREAS["Lajpat Nagar"],
    safetyScore: 94,
    routePoints: [ [28.6315, 77.2167], [28.6139, 77.2090], [28.5900, 77.2250], [28.5677, 77.2433] ],
    safeZones: ["Connaught Place CCTV Zone", "Lajpat Nagar Police Beat", "Metro Route Shielding"],
    unsafeZones: ["Paharganj dark alley bypass", "Sarai Kale Khan underpass bypass"]
  }
};

export default function StartTrip({ activeTrip, setActiveTrip }) {
  const [step, setStep]             = useState(STEP.INPUT);
  const [selectedCity, setSelectedCity] = useState('Delhi');
  const [srcInput, setSrcInput]     = useState('Connaught Place');
  const [dstInput, setDstInput]     = useState('Lajpat Nagar');
  const [srcPoint, setSrcPoint]     = useState(DELHI_AREAS["Connaught Place"]);
  const [dstPoint, setDstPoint]     = useState(DELHI_AREAS["Lajpat Nagar"]);
  const [routeError, setRouteError] = useState('');
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  
  // Set default routeData for Delhi on load (with curved routes)
  const [routeData, setRouteData]   = useState(() => {
    const defaultSafest = {
      name: "Delhi Safe Route Core",
      safety_score: 94,
      safety_label: 'Very Safe',
      distance_km: 6.8,
      eta_minutes: 18,
      origin: { lat: 28.6315, lon: 77.2167 },
      destination: { lat: 28.5677, lon: 77.2433 },
      waypoints: CITY_DATA.Delhi.routePoints.map(p => ({ lat: p[0], lon: p[1] })),
      explanation: "Safe routing calculated for Delhi. Avoiding known dark roads and prioritizing central CCTV hubs."
    };
    const defaultShortest = {
      name: "Delhi Shortest Bypass",
      safety_score: 86,
      safety_label: 'Safe',
      distance_km: 5.5,
      eta_minutes: 14,
      origin: { lat: 28.6315, lon: 77.2167 },
      destination: { lat: 28.5677, lon: 77.2433 },
      waypoints: CITY_DATA.Delhi.routePoints.map(p => ({ lat: p[0], lon: p[1] })),
      explanation: "Shorter direct path, includes some unlit roads near secondary bypasses."
    };
    
    return {
      success: true,
      safest_route: processRoute(defaultSafest),
      shortest_route: processRoute(defaultShortest),
      alternative_routes: [],
      explanation: "Safe routing calculated for Delhi. Avoiding known dark roads and prioritizing central CCTV hubs.",
      route_count: 2
    };
  });

  const [selectedRoute, setSelected] = useState(() => routeData.safest_route);
  const [currentPos, setCurrentPos] = useState(null);
  const [liveRisk, setLiveRisk]     = useState('LOW');
  const [threatInput, setThreatInput] = useState('');
  const [threatResult, setThreatResult] = useState(null);
  const [analyzing, setAnalyzing]   = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [escalationData, setEscalationData] = useState(null);
  const trackRef  = useRef(null);
  const wayptsRef = useRef([]);
  const autoRecordTimerRef = useRef(null);
  const recordingTimeoutRef = useRef(null);
  const audioStreamRef = useRef(null);

  const src = srcPoint;
  const dest = dstPoint;

  const handleSourceSelect = (val) => {
    setSrcInput(val);
    const area = DELHI_AREAS[val];
    if (area) {
      setSrcPoint({ lat: area.lat, lon: area.lon, name: area.name });
    }
  };

  const handleDestinationSelect = (val) => {
    setDstInput(val);
    const area = DELHI_AREAS[val];
    if (area) {
      setDstPoint({ lat: area.lat, lon: area.lon, name: area.name });
    }
  };

  // ── Step 1 → 2: Fetch all route options ───────────────────────────────────
  const handleAnalyzeRoutes = async () => {
    setLoadingRoutes(true);
    setRouteData(null);
    setRouteError('');
    try {
      const data = await getSafestRoute(srcPoint.lat, srcPoint.lon, dstPoint.lat, dstPoint.lon);
      if (data && data.success) {
        // Curve safest, shortest, and alternatives using single processRoute helper
        if (data.safest_route) {
          data.safest_route = processRoute(data.safest_route);
        }
        if (data.shortest_route) {
          data.shortest_route = processRoute(data.shortest_route);
        }
        if (data.alternative_routes) {
          data.alternative_routes = data.alternative_routes.map(r => processRoute(r));
        }

        setRouteData(data);
        setSelected(data.safest_route);
        setStep(STEP.ROUTES);
      } else {
        setRouteError('Unable to fetch routes. Please try again.');
      }
    } catch (e) {
      console.error(e);
      setRouteError('Unable to fetch real routes right now. Please retry.');
    } finally {
      setLoadingRoutes(false);
    }
  };

  // ── Step 2 → 3: Select route and start trip ────────────────────────────────
  const handleStartTrip = async (route) => {
    setSelected(route);
    try {
      const res = await startTrip(src.lat, src.lon, dest.lat, dest.lon, srcInput, dstInput, 1);
      const wps = route?.waypoints?.map(w => [w.lat, w.lon]) || [[src.lat, src.lon], [dest.lat, dest.lon]];
      wayptsRef.current = wps;
      setCurrentPos(wps[0]);
      setStep(STEP.TRACKING);

      const tripObj = {
        active: true,
        srcName: srcInput,
        dstName: dstInput,
        srcLat: src.lat,
        srcLon: src.lon,
        dstLat: dest.lat,
        dstLon: dest.lon,
        waypoints: wps,
        selectedRoute: route,
        tripId: res?.trip?.id || null,
        eta_minutes: route?.eta_minutes ?? 25
      };

      setActiveTrip(tripObj);
      startSimulation(wps, route);
    } catch (e) {
      console.error(e);
    }
  };

  // ── Animated position simulation ───────────────────────────────────────────
  const startSimulation = (wps, route) => {
    let startTime = null;
    const duration = Math.max(20000, Math.min(180000, (route?.duration_seconds || 900) * 100));

    const animate = (time) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      let progress = elapsed / duration;
      
      if (progress >= 1) {
        setCurrentPos(wps[wps.length - 1]);
        return; // Stop animation
      }
      
      const total = Math.max(1, wps.length - 1);
      const segIdx = Math.min(Math.floor(progress * total), total - 1);
      const segProg = (progress * total) - segIdx;
      const s = wps[segIdx], e = wps[segIdx + 1];
      
      // Interpolate position smoothly
      setCurrentPos([s[0] + (e[0] - s[0]) * segProg, s[1] + (e[1] - s[1]) * segProg]);
      
      trackRef.current = requestAnimationFrame(animate);
    };

    cancelAnimationFrame(trackRef.current);
    trackRef.current = requestAnimationFrame(animate);
  };

  // ── End trip → show feedback ───────────────────────────────────────────────
  const handleEndTrip = async () => {
    cancelAnimationFrame(trackRef.current);
    if (activeTrip?.tripId) await endTrip(activeTrip.tripId).catch(() => {});
    setStep(STEP.ENDED);
    setShowFeedback(true);
  };

  const handleFeedbackDone = () => {
    setShowFeedback(false);
    setStep(STEP.INPUT);
    setActiveTrip(null); setCurrentPos(null);
    setThreatResult(null); setLiveRisk('LOW');
    setRouteData(null); setSelected(null);
  };

  // Speech Recognition state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const voiceRecognitionRef = useRef(null);

  // Audio recording state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [showRecordingPrompt, setShowRecordingPrompt] = useState(false);
  const audioRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [contacts, setContacts] = useState([]);

  // Initialize SpeechRecognition and fetch contacts on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN';
      rec.onresult = (event) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setThreatInput(text);
          // Run analysis automatically after voice input
          handleThreatAnalysisWithText(text);
        }
      };
      rec.onend = () => setIsRecordingVoice(false);
      voiceRecognitionRef.current = rec;
    }

    const loadContacts = async () => {
      try {
        const res = await getContacts(1);
        if (res?.success) {
          setContacts(res.contacts);
        }
      } catch (err) {
        console.error("Failed to load contacts in StartTrip:", err);
      }
    };
    loadContacts();
  }, []);

  const toggleVoiceInput = () => {
    if (!voiceRecognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isRecordingVoice) {
      voiceRecognitionRef.current.stop();
      setIsRecordingVoice(false);
    } else {
      voiceRecognitionRef.current.start();
      setIsRecordingVoice(true);
    }
  };

  const handleThreatAnalysis = () => {
    handleThreatAnalysisWithText(threatInput);
  };

  const sendRecordingToContacts = async (audioRefId, transcriptText) => {
    try {
      const lat = currentPos?.[0] ?? srcPoint?.lat ?? 28.6315;
      const lon = currentPos?.[1] ?? srcPoint?.lon ?? 77.2167;
      const payload = {
        type: "EMERGENCY_AUDIO",
        message: "High risk emergency recorded audio attached",
        audio_reference_id: audioRefId,
        transcript: transcriptText,
        timestamp: new Date().toISOString()
      };
      const contactNums = (contacts || []).map(c => c.phone).filter(Boolean);
      const res = await triggerEmergency(
        lat, lon,
        1, 'FeelSafe User', activeTrip?.tripId || null, null, 'HIGH', 'High risk emergency recorded audio attached',
        { ...payload, contact_numbers: contactNums }
      );
      console.log("Trip audio recording alert dispatched:", res);
    } catch (err) {
      console.error("Failed to send trip emergency audio recording", err);
    }
  };

  const handleThreatAnalysisWithText = async (textVal) => {
    if (!textVal.trim()) return;
    setAnalyzing(true);
    setThreatResult(null);
    try {
      const res = await analyzeThreat(
        textVal,
        currentPos?.[0] ?? src?.lat ?? 28.6315,
        currentPos?.[1] ?? src?.lon ?? 77.2167,
        1, 'FeelSafe User', activeTrip?.tripId,
      );
      setThreatResult(res);
      const risk = res.risk_level || 'LOW';
      setLiveRisk(risk);

      if (risk === 'HIGH') {
        // Immediately start 30s audio recording (bypass prompt)
        startRecordingAudio(textVal || "High threat auto-record", 30);
      }

      // For MEDIUM/HIGH: show escalation modal THEN auto-open WhatsApp
      if ((risk === 'HIGH' || risk === 'MEDIUM') && res.auto_escalated) {
        setEscalationData(res.escalation_result);
        setShowEscalation(true);
        // Auto-open WA link after 2.5s for HIGH risk
        if (risk === 'HIGH' && res.escalation_result?.whatsapp_link) {
          setTimeout(() => {
            window.open(res.escalation_result.whatsapp_link, '_blank');
          }, 2500);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
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
      };

      audioRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingAudio(true);

      recordingTimeoutRef.current = setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, durationSeconds * 1000);
    } catch (err) {
      console.error('Failed to record audio', err);
      setIsRecordingAudio(false);
    }
  };

  const stopRecordingAudio = () => {
    if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
      audioRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    if (activeTrip && activeTrip.active) {
      setSrcInput(activeTrip.srcName);
      setDstInput(activeTrip.dstName);
      setSrcPoint({ lat: activeTrip.srcLat, lon: activeTrip.srcLon, name: activeTrip.srcName });
      setDstPoint({ lat: activeTrip.dstLat, lon: activeTrip.dstLon, name: activeTrip.dstName });
      setSelected(activeTrip.selectedRoute);
      setStep(STEP.TRACKING);
      wayptsRef.current = activeTrip.waypoints;
      setCurrentPos(activeTrip.waypoints[0]);
      startSimulation(activeTrip.waypoints, activeTrip.selectedRoute);
    }
    return () => {
      cancelAnimationFrame(trackRef.current);
      if (autoRecordTimerRef.current) clearTimeout(autoRecordTimerRef.current);
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const routeColor = selectedRoute
    ? scoreColor(selectedRoute.safety_score)
    : '#00FF9D'; // Default safe green instead of cyan

  const rawRoutes = routeData ? [
    routeData.safest_route,
    routeData.shortest_route && routeData.shortest_route.name !== routeData.safest_route.name ? routeData.shortest_route : null,
    ...(routeData.alternative_routes || [])
  ].filter(Boolean) : [];

  const getRouteLabel = (route, totalRoutesCount) => {
    if (totalRoutesCount === 1) {
      return "SAFEST ROUTE";
    }
    const score = route.safety_score;
    if (score >= 65) return "SAFEST ROUTE";
    if (score >= 40) return "SAFE ROUTE";
    return "UNSAFE ROUTE";
  };

  const allRoutes = rawRoutes.map(route => {
    const label = getRouteLabel(route, rawRoutes.length);
    const badgeColor = label === "SAFEST ROUTE" ? "#00FF9D" : label === "SAFE ROUTE" ? "#FFC857" : "#FF3B5C";
    return {
      ...route,
      _tag: label,
      _badge: badgeColor
    };
  });

  const borderColor = liveRisk === 'HIGH' ? '#FF3B5C' :
                      liveRisk === 'MEDIUM' ? '#FFC857' : '#00E5FF';

  const detectedMarkers = selectedRoute
    ? detectPOIsForRoute(selectedRoute.waypoints, DELHI_SAFETY_POIS)
    : [];

  const safeFactors = selectedRoute?.safety_factors || [
    "CCTV coverage active on central streets",
    "High frequency of police patrols",
    "Continuous street lighting"
  ];
  
  const avoidedRisks = [];
  if (selectedRoute?.unsafe_report_count > 0) {
    avoidedRisks.push(`Avoided ${selectedRoute.unsafe_report_count} community threat report zones`);
  }
  if (selectedRoute?.is_isolated) {
    avoidedRisks.push("Avoided fully isolated stretches");
  }
  if (avoidedRisks.length === 0) {
    avoidedRisks.push("No active high-risk zones detected on path");
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-6xl mx-auto flex flex-col md:flex-row gap-6">

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}
      {showFeedback && (
        <FeedbackModal
          tripId={activeTrip?.id}
          onClose={handleFeedbackDone}
          onSubmitted={handleFeedbackDone}
        />
      )}
      {showEscalation && escalationData && (
        <EscalationModal
          riskLevel={liveRisk}
          escalationResult={escalationData}
          threatText={threatResult?.text || ''}
          onClose={() => setShowEscalation(false)}
        />
      )}

      {/* ── LEFT PANEL ──────────────────────────────────────────────────────── */}
      <div className="w-full md:w-2/5 flex flex-col gap-4">
        <AnimatePresence mode="wait">

          {/* STEP 1: Source / Destination input */}
          {step === STEP.INPUT && (
            <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} className="glass p-6 rounded-3xl">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <BrainCircuit className="w-6 h-6 text-[#00E5FF]" /> Plan Safe Trip
              </h2>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-xs text-gray-400 uppercase mb-1 block font-semibold">Select City</label>
                  <select
                    value="Delhi"
                    disabled
                    className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#00E5FF] font-bold opacity-75 cursor-not-allowed"
                  >
                    <option value="Delhi">Delhi</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase mb-1 block">From</label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-3 w-4 h-4 text-[#00E5FF] z-10" />
                    <select
                      value={srcInput}
                      onChange={e => handleSourceSelect(e.target.value)}
                      className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#00E5FF] font-semibold appearance-none"
                    >
                      {Object.keys(DELHI_AREAS).map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase mb-1 block">To</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-[#00FF9D] z-10" />
                    <select
                      value={dstInput}
                      onChange={e => handleDestinationSelect(e.target.value)}
                      className="w-full bg-black/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#00FF9D] font-semibold appearance-none"
                    >
                      {Object.keys(DELHI_AREAS).map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {routeError && <div className="text-xs text-[#FF3B5C]">{routeError}</div>}
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleAnalyzeRoutes}
                disabled={loadingRoutes || !srcInput.trim() || !dstInput.trim()}
                className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-[#00E5FF] to-[#7C4DFF] text-white disabled:opacity-50">
                {loadingRoutes
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing Routes...</>
                  : <><BrainCircuit className="w-5 h-5" /> Analyze Safe Routes</>}
              </motion.button>
              <p className="text-xs text-gray-600 text-center mt-3">
                AI will compare safety scores, police coverage & community reports
              </p>
            </motion.div>
          )}

          {/* STEP 2: Route selection */}
          {step === STEP.ROUTES && routeData && (
            <motion.div key="routes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-3">
              <div className="glass p-5 rounded-3xl">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-bold">Choose Your Route</h2>
                  <button onClick={() => setStep(STEP.INPUT)} className="text-xs text-gray-500 hover:text-white">← Back</button>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{routeData.explanation}</p>
              </div>
              {allRoutes.map((route, i) => (
                <motion.div key={i} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={() => handleStartTrip(route)}
                  onMouseEnter={() => setSelected(route)}
                  className="cursor-pointer glass p-4 rounded-2xl border border-gray-800 hover:border-gray-600 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black px-2 py-0.5 rounded-full text-black"
                          style={{ background: route._badge }}>{route._tag}</span>
                        <span className="font-bold text-sm">{route.name}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500">
                        {route.distance_km && <span><TrendingDown className="inline w-3 h-3 mr-0.5" />{route.distance_km} km</span>}
                        {route.eta_minutes && <span><Clock className="inline w-3 h-3 mr-0.5" />{route.eta_minutes} min</span>}
                        <span><Shield className="inline w-3 h-3 mr-0.5" />{route.safety_label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black" style={{ color: scoreColor(route.safety_score) }}>
                        {route.safety_score}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* STEP 3: Active trip monitoring */}
          {step === STEP.TRACKING && (
            <motion.div key="tracking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4">
              {/* Live Status */}
              <div className="glass p-5 rounded-3xl border transition-all duration-500"
                style={{ borderColor: `${RISK_COLOR[liveRisk]}55` }}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold">Live Monitoring</h3>
                  <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                    style={{ color: RISK_COLOR[liveRisk], background: `${RISK_COLOR[liveRisk]}18`, border: `1px solid ${RISK_COLOR[liveRisk]}44` }}>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: RISK_COLOR[liveRisk] }}></span>
                    {liveRisk} RISK
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <StatMini label="ETA" value={`${activeTrip?.eta_minutes ?? 25}m`} color="#00E5FF" />
                  <StatMini label="Route" value={selectedRoute?.safety_label || 'Safe'} color="#00FF9D" />
                  <StatMini label="Score" value={selectedRoute?.safety_score ?? '—'} color="#7C4DFF" />
                </div>
              </div>

              {/* Threat Analysis */}
              <div className="glass p-5 rounded-3xl space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-[#FFC857]" /> AI Threat Analysis
                  </h3>
                  <button 
                    onClick={toggleVoiceInput}
                    className={`p-2 rounded-full flex items-center justify-center transition-all ${
                      isRecordingVoice ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                    title={isRecordingVoice ? 'Recording voice... Click to stop' : 'Use Voice Input'}
                  >
                    {isRecordingVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>
                <textarea rows={2} value={threatInput} onChange={e => setThreatInput(e.target.value)}
                  placeholder={isRecordingVoice ? "Listening... speak now..." : `Describe situation...\ne.g. "Someone is following me"`}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-sm text-white resize-none focus:outline-none focus:border-[#FFC857]" />
                <button onClick={handleThreatAnalysis} disabled={analyzing || !threatInput.trim()}
                  className="w-full py-2 rounded-xl text-sm font-bold bg-[#FFC857] text-black disabled:opacity-40 flex items-center justify-center gap-2">
                  {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : 'Analyze Threat'}
                </button>

                {/* Audio Recording Banner */}
                {isRecordingAudio && (
                  <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center justify-between text-xs animate-pulse">
                    <span className="text-red-400 font-bold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                      Audio Recording Active
                    </span>
                    <button 
                      onClick={stopRecordingAudio}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
                    >
                      Stop
                    </button>
                  </div>
                )}


                <AnimatePresence>
                  {threatResult && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className={`mt-3 p-3 rounded-xl border text-xs overflow-hidden ${
                        threatResult.risk_level === 'HIGH' ? 'border-[#FF3B5C]/50 bg-[#FF3B5C]/10' :
                        threatResult.risk_level === 'MEDIUM' ? 'border-[#FFC857]/50 bg-[#FFC857]/10' :
                        'border-[#00FF9D]/50 bg-[#00FF9D]/10'}`}>
                      <span className="font-bold" style={{ color: RISK_COLOR[threatResult.risk_level] }}>
                        {threatResult.risk_level}
                      </span>
                      {' — '}{threatResult.message}
                      {threatResult.auto_escalated && (
                        <div className="text-[#FFC857] mt-1 font-bold">
                          Auto-alerted {threatResult.escalation_result?.contacts_count ?? 0} contact(s)
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* End Trip */}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleEndTrip}
                className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF3B5C] to-red-700 text-white">
                <Square className="w-5 h-5" fill="currentColor" /> End Trip Safely
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── RIGHT PANEL: Map & Safety Intelligence ────────────────────────── */}
      <div className="w-full md:w-3/5 flex flex-col gap-6">
        <div className="glass rounded-3xl overflow-hidden h-[480px] relative border transition-all duration-700"
          style={{ borderColor: `${borderColor}44` }}>
          <MapView
            source={src ? [src.lat, src.lon] : null}
            destination={dest ? [dest.lat, dest.lon] : null}
            routeCoordinates={
              step === STEP.TRACKING ? wayptsRef.current :
              step === STEP.ROUTES
                ? (selectedRoute?.waypoints?.map(w => [w.lat, w.lon]) || CITY_DATA.Delhi.routePoints)
                : []
            }
            currentPosition={currentPos}
            routeColor={routeColor}
            riskLevel={liveRisk}
            markers={detectedMarkers}
          />
          {/* Radar ring during tracking */}
          {step === STEP.TRACKING && (
            <div className="absolute inset-0 pointer-events-none z-[400] flex items-center justify-center">
              <div className="w-[180%] h-[180%] rounded-full border animate-ping opacity-5"
                style={{ borderColor: RISK_COLOR[liveRisk] }} />
            </div>
          )}
          {/* Route info overlay during selection */}
          {step === STEP.ROUTES && allRoutes[0] && (
            <div className="absolute bottom-4 left-4 glass px-4 py-2 rounded-xl text-xs border border-gray-700 z-[400]">
              Showing <span className="font-bold text-[#00E5FF]">{routeData.route_count}</span> route options
            </div>
          )}
        </div>

        {/* Legend Box & Info Panel */}
        {selectedRoute && (
          <div className="glass p-5 rounded-3xl border border-white/5 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Why this route is safe</h3>
                <p className="text-gray-400 text-xs mt-0.5">Safety profile for selected route in Delhi</p>
              </div>

              {/* Safety Score Meter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-semibold">Safety Score:</span>
                <span className="text-xl font-black text-[#00FF9D]">{selectedRoute.safety_score}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="font-bold text-[#00FF9D]">🟢 Detected Safe Zones</div>
                <ul className="space-y-1">
                  {safeFactors.map((z, i) => (
                    <li key={i} className="text-gray-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00FF9D]"></span>
                      {z}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-[#FF3B5C]">🔴 Avoided Risk Zones</div>
                <ul className="space-y-1">
                  {avoidedRisks.map((z, i) => (
                    <li key={i} className="text-gray-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B5C]"></span>
                      {z}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Legend */}
            {detectedMarkers.length > 0 && (
              <div className="pt-3 border-t border-white/5 flex flex-wrap gap-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider justify-center">
                {detectedMarkers.some(m => m.type === 'hospital') && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🏥</span>
                    <span>Hospital</span>
                  </div>
                )}
                {detectedMarkers.some(m => m.type === 'medical') && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">💊</span>
                    <span>Medical Store</span>
                  </div>
                )}
                {detectedMarkers.some(m => m.type === 'police') && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🛡️</span>
                    <span>Police Station</span>
                  </div>
                )}
                {detectedMarkers.some(m => m.type === 'crowded') && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">👥</span>
                    <span>Crowded Area</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatMini({ label, value, color }) {
  return (
    <div className="bg-black/30 rounded-xl p-2">
      <div className="text-[10px] text-gray-500 uppercase mb-0.5">{label}</div>
      <div className="font-bold text-sm" style={{ color }}>{value}</div>
    </div>
  );
}
