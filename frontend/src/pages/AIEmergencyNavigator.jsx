import { useState, useEffect, useRef } from 'react';
import { 
  Shield, Phone, Navigation, AlertTriangle, Search, Mic, MicOff, Send, 
  AlertOctagon, Info, Globe, BookOpen, FileText, MapPin, Loader2, X, Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  triggerEmergency, getContacts, getSafestRoute, startTrip, endTrip 
} from '../services/api';
import { processRoute } from '../utils/routeEngine';
import MapView from '../components/MapView';
import { 
  STRINGS, classifyEmergency, getPrimaryHelpline, 
  generateResponseForCategory, generateFallbackMockServices, 
  haversineDistance, PROCEDURES 
} from '../utils/navigatorData';
import { universalVoiceEngine } from '../utils/voiceEngine';

export default function AIEmergencyNavigator() {
  // ── LANGUAGE FIRST STATE ───────────────────────────────────────────────────
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('nav_lang') || null;
  });

  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Crime');
  const [selectedSeverity, setSelectedSeverity] = useState('LOW');
  const [isClassifying, setIsClassifying] = useState(false);
  
  // Geolocation
  const [userLocation, setUserLocation] = useState([28.6315, 77.2167]); // Default Delhi CP
  const [locationName, setLocationName] = useState('Detecting current position...');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);

  // Search Engine
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchAiRecommendation, setSearchAiRecommendation] = useState(null);

  // Navigation & Simulation Stack
  const [navStep, setNavStep] = useState('IDLE'); // 'IDLE' | 'ROUTING' | 'TRACKING'
  const [activeDestination, setActiveDestination] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null);
  const [activeWaypoints, setActiveWaypoints] = useState([]);
  const [currentPos, setCurrentPos] = useState(null);
  const [activeTripId, setActiveTripId] = useState(null);
  const [routeFallbackWarning, setRouteFallbackWarning] = useState('');
  const [simulationFinishedMessage, setSimulationFinishedMessage] = useState('');

  // Proximity Map Filter
  const [radius, setRadius] = useState(10.0);
  
  // SOS States
  const [contacts, setContacts] = useState([]);
  const [isSosActivating, setIsSosActivating] = useState(false);
  const [sosCountdown, setSosCountdown] = useState(0);
  const [sosResult, setSosResult] = useState(null);
  const [showSosSuggestion, setShowSosSuggestion] = useState(false);

  // Voice Input Speech State
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [voiceMetadata, setVoiceMetadata] = useState(null);
  
  const countdownTimerRef = useRef(null);
  const trackRef = useRef(null);

  const loc = lang ? STRINGS[lang] : STRINGS.en;

  // Sync localized strings on load
  useEffect(() => {
    if (lang) {
      requestLocation();
      loadContacts();
    }
  }, [lang]);

  // Set up Voice engine cleanup on unmount
  useEffect(() => {
    return () => {
      universalVoiceEngine.stopListening();
    };
  }, []);

  const loadContacts = async () => {
    try {
      const res = await getContacts(1);
      if (res?.success) {
        setContacts(res.contacts);
      }
    } catch (err) {
      console.error("Failed to load contacts", err);
    }
  };

  const requestLocation = () => {
    setGpsLoading(true);
    setLocationPermissionDenied(false);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setLocationName(`GPS Lock: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          setGpsLoading(false);
          
          // Seed initial search items near user
          const initialFallback = generateFallbackMockServices(coords, "", radius);
          setSearchResults(initialFallback);
        },
        (error) => {
          console.error("GPS position access denied:", error);
          setUserLocation([28.6315, 77.2167]); // Delhi CP Fallback
          setLocationName(loc.gpsDenied);
          setLocationPermissionDenied(true);
          setGpsLoading(false);
          
          // Seed fallback places in Delhi center
          const initialFallback = generateFallbackMockServices([28.6315, 77.2167], "", radius);
          setSearchResults(initialFallback);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setUserLocation([28.6315, 77.2167]);
      setLocationName(loc.gpsUnsupported);
      setGpsLoading(false);
      const initialFallback = generateFallbackMockServices([28.6315, 77.2167], "", radius);
      setSearchResults(initialFallback);
    }
  };

  // Perform Location Search (OSM Nominatim API query with fallback)
  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchAiRecommendation(null);
    setRouteFallbackWarning('');

    const q = searchQuery.trim().toLowerCase();

    // 1. Pass search query to AI Emergency Intent classifier
    const aiClass = classifyEmergency(q);
    const primaryHelp = getPrimaryHelpline(aiClass.category);
    const categoryGuides = generateResponseForCategory(aiClass.category, lang);

    setSearchAiRecommendation({
      category: aiClass.category,
      severity: aiClass.severity,
      helpline: primaryHelp.number,
      helplineLabel: primaryHelp.label,
      firstStep: categoryGuides.steps[0]
    });

    // 2. Query Nominatim API for OpenStreetMap coordinates near the user location
    const [lat, lon] = userLocation;
    let searchUrlQuery = q;
    if (q.includes("police")) searchUrlQuery = "police station";
    else if (q.includes("hospital")) searchUrlQuery = "hospital";
    else if (q.includes("medical store") || q.includes("chemist") || q.includes("pharmacy")) searchUrlQuery = "pharmacy";
    else if (q.includes("cyber cell")) searchUrlQuery = "police station";

    const osmUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&lat=${lat}&lon=${lon}&q=${encodeURIComponent(searchUrlQuery)}`;
    
    try {
      const res = await fetch(osmUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FeelSafe-Emergency-Assistant/1.0'
        }
      });
      
      if (!res.ok) throw new Error("Nominatim status failed");
      const data = await res.json();
      
      let parsedResults = [];
      if (Array.isArray(data) && data.length > 0) {
        parsedResults = data.map((item, idx) => {
          const itemLat = Number(item.lat);
          const itemLon = Number(item.lon);
          const dist = haversineDistance(lat, lon, itemLat, itemLon);
          
          let resolvedType = "police";
          let symbol = "🛡️";
          if (q.includes("hospital")) {
            resolvedType = "hospital";
            symbol = "🏥";
          } else if (q.includes("medical") || q.includes("pharmacy") || q.includes("chemist")) {
            resolvedType = "medical store";
            symbol = "💊";
          } else if (q.includes("cyber")) {
            resolvedType = "cyber cell";
            symbol = "💻";
          } else {
            const categoryText = (item.type || item.category || '').toLowerCase();
            if (categoryText.includes("hospital") || categoryText.includes("clinic") || categoryText.includes("doctors")) {
              resolvedType = "hospital";
              symbol = "🏥";
            } else if (categoryText.includes("pharmacy") || categoryText.includes("chemist")) {
              resolvedType = "medical store";
              symbol = "💊";
            } else if (categoryText.includes("cyber") || categoryText.includes("security")) {
              resolvedType = "cyber cell";
              symbol = "💻";
            }
          }

          return {
            id: `osm-${idx}`,
            name: item.display_name.split(',')[0] || item.name || "Emergency Station",
            type: resolvedType,
            symbol: symbol,
            phone: resolvedType === 'police' ? '112' : resolvedType === 'hospital' ? '108' : resolvedType === 'cyber cell' ? '1930' : '102',
            position: [itemLat, itemLon],
            distance_km: Math.round(dist * 10) / 10
          };
        }).filter(item => item.distance_km <= radius);
      }

      if (parsedResults.length < 3) {
        const fallbacks = generateFallbackMockServices(userLocation, q, radius);
        const combined = [...parsedResults];
        fallbacks.forEach(fb => {
          if (!combined.some(existing => existing.name.toLowerCase() === fb.name.toLowerCase())) {
            combined.push(fb);
          }
        });
        setSearchResults(combined.sort((a, b) => a.distance_km - b.distance_km));
      } else {
        setSearchResults(parsedResults.sort((a, b) => a.distance_km - b.distance_km));
      }
    } catch (err) {
      console.warn("Nominatim search failed, falling back to mock results engine:", err);
      const fallbacks = generateFallbackMockServices(userLocation, q, radius);
      setSearchResults(fallbacks.sort((a, b) => a.distance_km - b.distance_km));
    } finally {
      setIsSearching(false);
    }
  };

  // ── INTEGRATE STARTTRIP ROUTING SYSTEM & SIMULATION ─────────────────────────
  const handleNavigate = async (place) => {
    setRouteFallbackWarning('');
    setSimulationFinishedMessage('');
    setNavStep('ROUTING');
    setActiveDestination(place);
    
    const [srcLat, srcLon] = userLocation;
    const destPos = place?.position;
    
    if (!Array.isArray(destPos) || destPos.length < 2) {
      console.error('[NAVIGATE] ❌ Destination coordinates missing');
      setRouteFallbackWarning('⚠️ Destination coordinates are missing.');
      setNavStep('IDLE');
      return;
    }
    
    const [dstLat, dstLon] = destPos;
    console.log('[NAVIGATE] Starting route from:', srcLat, srcLon, 'to:', dstLat, dstLon);

    try {
      // 1. Get safety-optimized route from database
      const data = await getSafestRoute(srcLat, srcLon, dstLat, dstLon);
      
      if (data?.success && data.safest_route) {
        // 2. Process route through routeEngine curvature engine (identical to StartTrip)
        const processed = processRoute(data.safest_route);
        const wps = processed.waypoints.map(w => [w.lat, w.lon]);
        
        // 3. Register trip session in FeelSafe backend
        const res = await startTrip(srcLat, srcLon, dstLat, dstLon, 'Your Location', place.name, 1);
        
        setActiveRoute(processed);
        setActiveWaypoints(wps);
        setCurrentPos(wps[0]);
        setActiveTripId(res?.trip?.id || null);
        setNavStep('TRACKING');
        
        // 4. Fire smooth tracking simulation
        startSimulation(wps, processed);
      } else {
        throw new Error('Routing API failed to return route data');
      }
    } catch (err) {
      console.warn('[NAVIGATE] Routing failed. Launching straight line fallback:', err);
      // Fallback straight line
      const fallbackRoute = {
        name: "Direct Route",
        safety_score: 50,
        safety_label: 'Moderate',
        distance_km: haversineDistance(srcLat, srcLon, dstLat, dstLon),
        eta_minutes: Math.ceil(haversineDistance(srcLat, srcLon, dstLat, dstLon) * 3),
        origin: { lat: srcLat, lon: srcLon },
        destination: { lat: dstLat, lon: dstLon },
        waypoints: [{ lat: srcLat, lon: srcLon }, { lat: dstLat, lon: dstLon }]
      };
      
      const processed = processRoute(fallbackRoute);
      const wps = processed.waypoints.map(w => [w.lat, w.lon]);
      
      setActiveRoute(processed);
      setActiveWaypoints(wps);
      setCurrentPos(wps[0]);
      setNavStep('TRACKING');
      setRouteFallbackWarning(loc.routeFallbackWarning);
      
      startSimulation(wps, processed);
    }
  };

  // Verbatim simulation handler from StartTrip system
  const startSimulation = (wps, route) => {
    let startTime = null;
    // Animate over 20s to 3mins depending on eta/duration
    const duration = Math.max(20000, Math.min(120000, (route?.duration_seconds || (route?.eta_minutes * 60) || 900) * 100));

    const animate = (time) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      let progress = elapsed / duration;
      
      if (progress >= 1) {
        setCurrentPos(wps[wps.length - 1]);
        setSimulationFinishedMessage(loc.simulationFinished);
        return;
      }
      
      const total = Math.max(1, wps.length - 1);
      const segIdx = Math.min(Math.floor(progress * total), total - 1);
      const segProg = (progress * total) - segIdx;
      const s = wps[segIdx], e = wps[segIdx + 1];
      
      setCurrentPos([s[0] + (e[0] - s[0]) * segProg, s[1] + (e[1] - s[1]) * segProg]);
      trackRef.current = requestAnimationFrame(animate);
    };

    cancelAnimationFrame(trackRef.current);
    trackRef.current = requestAnimationFrame(animate);
  };

  const handleEndNavigation = async () => {
    cancelAnimationFrame(trackRef.current);
    if (activeTripId) {
      await endTrip(activeTripId).catch(() => {});
    }
    setNavStep('IDLE');
    setActiveDestination(null);
    setActiveRoute(null);
    setActiveWaypoints([]);
    setCurrentPos(null);
    setActiveTripId(null);
    setSimulationFinishedMessage('');
  };

  // AI Chat submits
  const handleChatSubmit = (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    setIsClassifying(true);
    const textVal = chatInput;
    setChatInput('');

    // Classification (multilingual keyword match logic)
    const { category, severity } = classifyEmergency(textVal);
    setSelectedCategory(category);
    setSelectedSeverity(severity);

    const actionResponse = generateResponseForCategory(category, lang);

    const newUserMsg = { sender: 'user', text: textVal };
    const newAiMsg = { 
      sender: 'ai', 
      category, 
      severity, 
      steps: actionResponse.steps, 
      helplines: actionResponse.helplines,
      links: actionResponse.links,
      safety: actionResponse.safety 
    };

    setMessages((prev) => [...prev, newUserMsg, newAiMsg]);
    setIsClassifying(false);

    if (severity === 'HIGH') {
      setShowSosSuggestion(true);
    }
  };

  const toggleMic = () => {
    if (!universalVoiceEngine.isSupported()) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) {
      universalVoiceEngine.stopListening();
      setIsListening(false);
    } else {
      setSpeechError('');
      setIsListening(true);
      universalVoiceEngine.startListening({
        lang: 'auto',
        continuous: false,
        onResult: (result) => {
          setChatInput(result.text);
          setVoiceMetadata({
            text: result.text,
            language: result.language,
            source: 'voice'
          });

          if (result.isFinal) {
            // Auto classification trigger
            const { category, severity } = classifyEmergency(result.text);
            setSelectedCategory(category);
            setSelectedSeverity(severity);
            if (severity === 'HIGH') {
              setShowSosSuggestion(true);
            }
          }
        },
        onError: (err) => {
          console.error(err);
          setSpeechError('Speech input failed. Try typing.');
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        }
      });
    }
  };

  // SOS Trigger dispatch mechanism
  const triggerSOS = () => {
    setShowSosSuggestion(false);
    if (isSosActivating) return;
    
    setIsSosActivating(true);
    setSosCountdown(5);

    let current = 5;
    countdownTimerRef.current = setInterval(() => {
      current -= 1;
      setSosCountdown(current);
      if (current <= 0) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setSosCountdown(0);
        executeSOSCall();
      }
    }, 1000);
  };

  const cancelSOS = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setSosCountdown(0);
    setIsSosActivating(false);
    setSosResult(null);
  };

  const executeSOSCall = async () => {
    try {
      const contactNums = contacts.map(c => c.phone).filter(Boolean);
      // SOS uses animated active tracking location if in trip, else static location
      const alertLat = currentPos ? currentPos[0] : userLocation[0];
      const alertLon = currentPos ? currentPos[1] : userLocation[1];

      const res = await triggerEmergency(
        alertLat,
        alertLon,
        1,
        'FeelSafe User',
        activeTripId,
        null,
        'HIGH',
        `SOS alert triggered via Navigator. Category: ${selectedCategory}. Lang: ${lang}`,
        { 
          contact_numbers: contactNums,
          origin_lat: userLocation[0],
          origin_lon: userLocation[1],
          destination_lat: activeDestination?.position?.[0] || null,
          destination_lon: activeDestination?.position?.[1] || null,
          text: voiceMetadata ? voiceMetadata.text : `SOS alert triggered via Navigator. Category: ${selectedCategory}. Lang: ${lang}`,
          language: voiceMetadata ? voiceMetadata.language : lang,
          source: voiceMetadata ? "voice" : "ui"
        }
      );
      
      setSosResult(res);
      if (res?.whatsapp_link) {
        window.open(res.whatsapp_link, '_blank');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const primaryHelpline = getPrimaryHelpline(selectedCategory);

  // Clean-up animation timers on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(trackRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // ── RENDER SPLASH SCREEN IF NO LANGUAGE IS LOCKED ───────────────────────────
  if (!lang) {
    return (
      <div className="fixed inset-0 bg-[#070913] bg-gradient-to-br from-[#0B1020] via-[#05070F] to-black flex flex-col items-center justify-center p-4 z-[999]">
        <div className="absolute inset-0 bg-[url('https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png')] bg-repeat opacity-5 pointer-events-none" />
        
        <div className="max-w-2xl w-full text-center space-y-8 relative">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center space-y-4"
          >
            <div className="p-5 bg-[#00E5FF]/10 rounded-full border border-[#00E5FF]/20 shadow-[0_0_40px_rgba(0,229,255,0.15)]">
              <Shield className="w-16 h-16 text-[#00E5FF] drop-shadow-[0_0_12px_rgba(0,229,255,0.6)] animate-pulse" />
            </div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 tracking-wider">
              FeelSafe Emergency Platform
            </h1>
            <p className="text-gray-400 text-sm max-w-md">
              Choose your preferred language for localized emergency classifications, government procedures, and safe path navigation.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {[
              { code: 'en', title: 'English', desc: 'Global interface', border: 'border-[#00FF9D]/30', glow: 'shadow-[0_0_20px_rgba(0,255,157,0.1)]', labelColor: 'text-[#00FF9D]' },
              { code: 'hi', title: 'हिन्दी (Hindi)', desc: 'हिंदी नेविगेशन', border: 'border-[#FFC857]/30', glow: 'shadow-[0_0_20px_rgba(255,200,87,0.1)]', labelColor: 'text-[#FFC857]' },
              { code: 'kn', title: 'ಕನ್ನಡ (Kannada)', desc: 'ಕನ್ನಡ ಇಂಟರ್ಫೇಸ್', border: 'border-[#7C4DFF]/30', glow: 'shadow-[0_0_20px_rgba(124,77,255,0.1)]', labelColor: 'text-[#7C4DFF]' }
            ].map((langOpt) => (
              <motion.button
                key={langOpt.code}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setLang(langOpt.code);
                  localStorage.setItem('nav_lang', langOpt.code);
                }}
                className={`p-6 bg-black/60 backdrop-blur-md rounded-3xl border ${langOpt.border} ${langOpt.glow} text-left flex flex-col justify-between h-40 transition-all hover:bg-black/80`}
              >
                <div className="flex justify-between items-center w-full">
                  <Globe className={`w-6 h-6 ${langOpt.labelColor}`} />
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">{langOpt.code}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{langOpt.title}</h3>
                  <p className="text-xs text-gray-400">{langOpt.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER MAIN EMERGENCY INTERFACE ─────────────────────────────────────────
  return (
    <div className="min-h-screen px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-6 text-white bg-[#070913]">
      
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Shield className="w-8 h-8 text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]" />
            <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-[#00FF9D]">
              {loc.title}
            </h1>
          </div>
          <p className="text-gray-400 text-xs mt-1">
            {loc.subtitle}
          </p>
        </div>

        {/* Action controls (Reset Lang, Geolocation status) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-2xl">
            {[['en', 'EN'], ['hi', 'हिन्दी'], ['kn', 'ಕನ್ನಡ']].map(([code, label]) => (
              <button
                key={code}
                onClick={() => {
                  setLang(code);
                  localStorage.setItem('nav_lang', code);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-300 ${
                  lang === code 
                    ? 'bg-[#00E5FF] text-[#0B1020] shadow-[0_0_12px_rgba(0,229,255,0.3)]' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button 
            onClick={requestLocation} 
            disabled={gpsLoading}
            className="p-2.5 bg-black/30 border border-white/10 backdrop-blur-md rounded-2xl hover:bg-white/10 transition-colors disabled:opacity-50 text-[#00E5FF] flex items-center gap-2 text-xs font-bold"
          >
            <MapPin className={`w-4 h-4 ${gpsLoading ? 'animate-pulse' : ''}`} />
            <span>GPS</span>
          </button>
        </div>
      </div>

      {/* ── SEARCH BAR ──────────────────────────────────────────────────────── */}
      {navStep === 'IDLE' && (
        <div className="bg-black/30 border border-white/10 backdrop-blur-md p-4 rounded-3xl space-y-3 shadow-lg">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={loc.searchPlaceholder}
                className="w-full pl-12 pr-4 py-3 bg-black/50 border border-white/10 rounded-2xl text-white text-sm outline-none focus:border-[#00E5FF] transition-all"
              />
            </div>
            <button 
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 bg-[#00E5FF] text-[#0B1020] font-black text-xs uppercase tracking-wider rounded-2xl hover:scale-102 hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all disabled:opacity-50"
            >
              {isSearching ? loc.searchingBtn : loc.searchBtn}
            </button>
          </form>

          {/* AI suggestion banner */}
          <AnimatePresence>
            {searchAiRecommendation && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="p-3 bg-red-950/20 border border-red-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#FF3B5C] shrink-0" />
                  <div>
                    <span className="font-bold text-white block">
                      {loc.sosTriggerTitle} ({searchAiRecommendation.category})
                    </span>
                    <span className="text-gray-400">
                      Recommended Helpline: <strong className="text-white">{searchAiRecommendation.helpline}</strong>. First step: {searchAiRecommendation.firstStep}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCategory(searchAiRecommendation.category);
                    setSelectedSeverity(searchAiRecommendation.severity);
                    const newAiMsg = {
                      sender: 'ai',
                      category: searchAiRecommendation.category,
                      severity: searchAiRecommendation.severity,
                      ...generateResponseForCategory(searchAiRecommendation.category, lang)
                    };
                    setMessages(prev => [...prev, newAiMsg]);
                    setSearchAiRecommendation(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 transition-all text-[11px]"
                >
                  {loc.chatHeader}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── SOS TRIGGER SYSTEM ACTIVE PANEL ──────────────────────────────────── */}
      <AnimatePresence>
        {isSosActivating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-5 bg-red-950/40 border border-red-500/30 rounded-3xl text-xs text-white space-y-3 relative z-30 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#FF3B5C] font-black text-sm uppercase">
                <AlertOctagon className="w-5 h-5 animate-pulse" />
                {sosCountdown > 0 ? `${loc.sosTriggerIn} ${sosCountdown}s` : loc.sosActiveTitle}
              </div>
              <button 
                onClick={cancelSOS}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] uppercase transition-all"
              >
                {loc.cancelBtnText}
              </button>
            </div>
            
            {sosCountdown > 0 ? (
              <p className="text-gray-300">Pinging emergency networks. Real-time Twilio SMS and WhatsApp notifications are staging.</p>
            ) : sosResult ? (
              <div className="space-y-2.5">
                <p className="font-bold text-emerald-400">{loc.sosLogSuccess}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-2 bg-black/40 border border-white/5 rounded-xl">
                    <span className="text-gray-500 text-[10px] block">{loc.sosLogSms}</span>
                    <span className="font-bold text-white uppercase text-xs">Delivered / En Route</span>
                  </div>
                  <div className="p-2 bg-black/40 border border-white/5 rounded-xl">
                    <span className="text-gray-500 text-[10px] block">{loc.sosLogEscalation}</span>
                    <span className="font-bold text-white text-xs">Severity Tier: {sosResult.escalation_level || 1}</span>
                  </div>
                  {sosResult.whatsapp_link && (
                    <a 
                      href={sosResult.whatsapp_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-center flex flex-col justify-center transition-all"
                    >
                      <span className="text-emerald-400 font-bold text-xs">{loc.sosLogWhatsapp}</span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#FF3B5C]" />
                <span className="text-gray-400">{loc.sosLogBroadcasting}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACTIVE TRIP NEURAL NAVIGATION SYSTEM HUD (STARTTRIP CLONE) ────────── */}
      <AnimatePresence>
        {navStep === 'TRACKING' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-5 bg-gradient-to-r from-cyan-950/40 to-[#0B1020]/80 border border-[#00E5FF]/40 rounded-3xl text-white space-y-4 shadow-xl"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 text-[#00E5FF] font-black text-sm uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00FF9D] animate-ping" />
                  {loc.activeNavHudTitle}
                </div>
                <p className="text-gray-400 text-xs mt-0.5">{loc.activeNavHudSubtitle}</p>
              </div>
              <button
                onClick={handleEndNavigation}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
              >
                <Square className="w-4 h-4 fill-white" />
                {loc.endNavBtn}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-3 bg-black/40 border border-white/5 rounded-2xl">
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Destination</span>
                <span className="font-bold text-white text-sm truncate block">{activeDestination?.name}</span>
              </div>
              <div className="p-3 bg-black/40 border border-white/5 rounded-2xl">
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Remaining Distance</span>
                <span className="font-bold text-[#00FF9D] text-sm block">
                  {currentPos && activeDestination?.position ? 
                    `${(haversineDistance(currentPos[0], currentPos[1], activeDestination.position[0], activeDestination.position[1])).toFixed(2)} km` 
                    : '--'}
                </span>
              </div>
              <div className="p-3 bg-black/40 border border-white/5 rounded-2xl">
                <span className="text-gray-500 text-[10px] uppercase font-bold block">Route Security Score</span>
                <span className="font-bold text-[#00FF9D] text-sm block">
                  {activeRoute?.safety_score || '75'}/100 ({activeRoute?.safety_label || 'Safe'})
                </span>
              </div>
              
              {/* Simulation arrived state or live coordinates tracker */}
              <div className="p-3 bg-black/40 border border-[#00E5FF]/20 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-gray-500 text-[10px] uppercase font-bold block">Live Coords</span>
                  <span className="text-[11px] font-mono text-gray-300 block">
                    {currentPos ? `${currentPos[0].toFixed(5)}, ${currentPos[1].toFixed(5)}` : 'Detecting...'}
                  </span>
                </div>
                <button
                  onClick={triggerSOS}
                  className="px-3.5 py-2 bg-[#FF3B5C] hover:bg-red-600 text-white font-black text-[10px] rounded-xl transition-all shadow-[0_0_10px_rgba(255,59,92,0.4)]"
                >
                  SOS
                </button>
              </div>
            </div>

            {simulationFinishedMessage && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 font-bold text-center text-xs"
              >
                🎉 {simulationFinishedMessage}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN GRID ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── LEFT COLUMN: AI Chat Assistant + SOS Panel ─────────────────────── */}
        <div className="lg:col-span-2 flex flex-col space-y-6">
          
          {/* Chat Panel */}
          <div className="bg-black/30 border border-white/5 backdrop-blur-md p-5 rounded-3xl flex flex-col h-[520px] relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00E5FF] rounded-full mix-blend-screen filter blur-[60px] opacity-10 pointer-events-none" />
            <h2 className="font-bold text-lg mb-3 flex items-center gap-2 text-white">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-pulse"></span>
              {loc.chatHeader}
            </h2>

            {/* Chat message bubbles */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin mb-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <Info className="w-6 h-6 text-gray-500" />
                  </div>
                  <p className="text-gray-400 text-xs max-w-sm">
                    {loc.chatNoMessages}
                  </p>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`p-4 max-w-[85%] rounded-2xl border ${
                      m.sender === 'user' 
                        ? 'bg-[#00E5FF]/10 border-[#00E5FF]/20 text-white rounded-tr-none' 
                        : 'bg-black/40 border-white/5 text-gray-200 rounded-tl-none space-y-3 shadow-md'
                    }`}>
                      {m.sender === 'user' ? (
                        <p className="text-sm font-medium">{m.text}</p>
                      ) : (
                        <>
                          <div className="flex items-center justify-between border-b border-white/10 pb-2 gap-4">
                            <span className="font-bold text-xs uppercase tracking-wider text-[#00E5FF]">
                              {loc.categoryLabels[m.category] || m.category}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                              m.severity === 'HIGH' ? 'bg-[#FF3B5C]/20 text-[#FF3B5C]' :
                              m.severity === 'MEDIUM' ? 'bg-[#FFC857]/20 text-[#FFC857]' : 'bg-[#00FF9D]/20 text-[#00FF9D]'
                            }`}>
                              {loc.severityLabel}: {m.severity}
                            </span>
                          </div>

                          {/* Action steps */}
                          <div className="space-y-1.5">
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                              {loc.stepsLabel}
                            </h4>
                            <ul className="text-xs text-gray-400 space-y-1 pl-4 list-disc leading-relaxed">
                              {m.steps.map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Helplines list */}
                          <div className="space-y-1.5">
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                              {loc.helplinesLabel}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {m.helplines.map((h, idx) => (
                                <a 
                                  key={idx} 
                                  href={`tel:${h.number}`}
                                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[11px] font-semibold flex items-center gap-1 transition-all"
                                >
                                  <span>{h.label}: {h.number}</span>
                                </a>
                              ))}
                            </div>
                          </div>

                          {/* Links */}
                          {m.links && m.links.length > 0 && (
                            <div className="space-y-1.5">
                              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                {loc.linksLabel}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {m.links.map((link, idx) => (
                                  <a 
                                    key={idx}
                                    href={link.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-[#00E5FF] underline font-medium"
                                  >
                                    {link.name} ↗
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Safety tips */}
                          <div className="space-y-1 pt-2 border-t border-white/5">
                            <span className="text-[11px] font-semibold text-gray-400 block">
                              {loc.safetyLabel}
                            </span>
                            <p className="text-[11px] text-gray-400 leading-relaxed italic">
                              {m.safety}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input bar */}
            <form onSubmit={handleChatSubmit} className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-3 rounded-2xl flex items-center justify-center transition-all ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                  }`}
                  title="Voice Input"
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={isListening ? loc.chatListening : loc.chatPlaceholder}
                  className="flex-1 p-3 bg-black/40 border border-white/10 rounded-2xl text-white text-sm outline-none focus:border-[#00E5FF] transition-all"
                />

                <button 
                  type="submit"
                  disabled={isClassifying || !chatInput.trim()}
                  className="p-3 rounded-2xl bg-[#00E5FF] text-[#0B1020] font-bold hover:scale-105 transition-all disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              {speechError && <div className="text-xs text-red-400 text-center">{speechError}</div>}
            </form>
          </div>

          {/* Primary Recommended Helpline Call Action + SOS Action Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/30 border border-white/5 backdrop-blur-md p-5 rounded-3xl flex flex-col justify-between space-y-4 shadow-lg">
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider block">{loc.recommendedHelplineTitle}</span>
                <span className="text-xs text-gray-500 capitalize">{loc.recommendedHelplineSubtitle}</span>
                <h3 className="text-lg font-black text-white mt-1">{primaryHelpline.label} ({primaryHelpline.number})</h3>
              </div>
              <a 
                href={`tel:${primaryHelpline.number}`}
                className="w-full py-3 bg-gradient-to-r from-[#FF3B5C] to-red-600 text-white font-bold text-center rounded-2xl hover:scale-102 transition-all shadow-md text-xs tracking-wider uppercase"
              >
                {loc.callNowBtn}
              </a>
            </div>

            <div className="bg-black/30 border border-[#FF3B5C]/35 bg-red-950/5 backdrop-blur-md p-5 rounded-3xl flex flex-col justify-between space-y-3 shadow-lg">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4.5 h-4.5 text-[#FF3B5C]" />
                  {loc.sosPanelTitle}
                </h3>
                <p className="text-gray-400 text-[11px]">
                  {loc.sosPanelDesc}
                </p>
              </div>
              <button
                onClick={triggerSOS}
                disabled={isSosActivating}
                className="w-full py-3 bg-gradient-to-br from-red-500 to-[#FF3B5C] text-white font-black rounded-2xl shadow-xl hover:scale-102 transition-all border border-red-400/30 uppercase text-xs tracking-widest flex items-center justify-center gap-1.5"
              >
                <AlertOctagon className="w-4 h-4" />
                {loc.sosPanelBtn}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: MapView + Nearby Finder + Guides ────────────────── */}
        <div className="space-y-6">
          
          {/* Map Finder Block */}
          <div className="bg-black/30 border border-white/5 backdrop-blur-md p-5 rounded-3xl space-y-4 shadow-lg">
            <h3 className="font-bold text-base text-white flex items-center justify-between">
              <span>{loc.nearestServicesTitle}</span>
              {gpsLoading && <Loader2 className="w-4.5 h-4.5 animate-spin text-[#00E5FF]" />}
            </h3>

            {/* Slider radius */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400 font-semibold">
                <span>{loc.radiusLabel}</span>
                <span className="text-[#00E5FF] font-bold">{radius} km</span>
              </div>
              <input 
                type="range" min="5.0" max="10.0" step="0.5" value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
              />
            </div>

            {/* Route fallback warning banner */}
            {routeFallbackWarning && (
              <div className="px-3 py-2 bg-yellow-900/30 border border-yellow-500/30 rounded-xl text-[11px] text-yellow-400 font-semibold flex items-center gap-2">
                <span>{routeFallbackWarning}</span>
                <button onClick={() => setRouteFallbackWarning('')} className="ml-auto text-yellow-500 hover:text-white">✕</button>
              </div>
            )}

            {/* Enhanced MapView Component (Identical to StartTrip) */}
            <div className="h-[250px] rounded-2xl overflow-hidden border border-white/10 relative shadow-[0_4px_20px_rgba(0,0,0,0.5)] bg-[#0B1020]">
              <MapView
                source={userLocation}
                destination={activeDestination?.position || null}
                routeCoordinates={activeWaypoints}
                currentPosition={currentPos}
                riskLevel={selectedSeverity}
                routeColor={selectedSeverity === 'HIGH' ? '#FF3B5C' : selectedSeverity === 'MEDIUM' ? '#FFC857' : '#00E5FF'}
                markers={searchResults.map(s => ({
                  position: s.position,
                  type: s.type === 'hospital' ? 'hospital' : s.type === 'police' ? 'police' : s.type === 'medical store' ? 'medical' : 'police',
                  label: `${s.name} (${s.distance_km} km)`
                }))}
              />

              {activeDestination && (
                <div className="absolute top-3 left-3 z-[1000] bg-black/70 backdrop-blur-md px-3 py-2 rounded-xl border border-[#00E5FF]/40 text-xs flex items-center gap-2 shadow-lg">
                  <span className="text-gray-300 font-bold">{loc.navigatingTo} {activeDestination.name.substring(0, 15)}...</span>
                  <button 
                    onClick={handleEndNavigation}
                    className="p-1 rounded bg-[#FF3B5C]/20 hover:bg-[#FF3B5C]/40 text-[#FF3B5C]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Queried results list */}
            {navStep === 'IDLE' && (
              <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1 scrollbar-thin">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-gray-500 italic text-center py-4">{loc.noResultsText}</p>
                ) : (
                  searchResults.map((service) => {
                    const isRouteToThis = activeDestination?.id === service.id;
                    return (
                      <div 
                        key={service.id} 
                        className={`p-3 bg-black/40 border rounded-2xl flex items-center justify-between text-xs transition-all hover:bg-black/60 ${
                          isRouteToThis ? 'border-[#00E5FF]/60 bg-[#00E5FF]/5' : 'border-white/5'
                        }`}
                      >
                        <div className="space-y-0.5 max-w-[70%] text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{service.symbol}</span>
                            <span className="font-bold text-white truncate max-w-[170px]" title={service.name}>
                              {service.name}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-400 flex items-center gap-2">
                            <span className="capitalize">{service.type}</span>
                            <span>·</span>
                            <span className="text-[#00E5FF] font-bold">{service.distance_km} km</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-1.5">
                          <a 
                            href={`tel:${service.phone}`}
                            className="px-2.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                            title="Call Emergency"
                          >
                            <Phone className="w-3.5 h-3.5 text-gray-300" />
                          </a>
                          <button
                            onClick={() => handleNavigate(service)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 ${
                              isRouteToThis 
                                ? 'bg-[#00E5FF] text-[#0B1020] border-[#00E5FF]' 
                                : 'bg-white/5 text-[#00E5FF] border-[#00E5FF]/20 hover:bg-[#00E5FF]/10'
                            }`}
                          >
                            <Navigation className="w-3 h-3" />
                            <span>{loc.showRouteBtn}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Emergency Guide protocols */}
          <div className="bg-black/30 border border-white/5 backdrop-blur-md p-5 rounded-3xl space-y-4 shadow-lg">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#00FF9D]" />
              {loc.guidesTitle}
            </h3>

            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-3 text-left">
              <div className="text-xs font-bold text-[#00FF9D] uppercase tracking-wider">
                {selectedCategory} Protocol
              </div>
              <ol className="text-xs text-gray-300 space-y-2 pl-4 list-decimal leading-relaxed">
                {generateResponseForCategory(selectedCategory, lang).steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* Government procedures navigator */}
          <div className="bg-black/30 border border-white/5 backdrop-blur-md p-5 rounded-3xl space-y-4 shadow-lg">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#FFC857]" />
              {loc.proceduresTitle}
            </h3>

            <div className="space-y-3 text-left">
              {selectedCategory === 'Cybercrime' && (
                <div className="p-4 bg-yellow-950/10 border border-[#FFC857]/20 rounded-2xl space-y-2 animate-fade-in">
                  <div className="font-bold text-xs text-[#FFC857]">{PROCEDURES[lang]?.cyber?.title}</div>
                  <ul className="text-[11px] text-gray-400 space-y-1.5 list-disc pl-4 leading-relaxed">
                    {PROCEDURES[lang]?.cyber?.steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedCategory === 'Document loss' && (
                <div className="p-4 bg-yellow-950/10 border border-[#FFC857]/20 rounded-2xl space-y-2 animate-fade-in">
                  <div className="font-bold text-xs text-[#FFC857]">{PROCEDURES[lang]?.aadhaar?.title}</div>
                  <ul className="text-[11px] text-gray-400 space-y-1.5 list-disc pl-4 leading-relaxed">
                    {PROCEDURES[lang]?.aadhaar?.steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(selectedCategory === 'Crime' || selectedCategory === 'Accident') && (
                <div className="p-4 bg-yellow-950/10 border border-[#FFC857]/20 rounded-2xl space-y-2 animate-fade-in">
                  <div className="font-bold text-xs text-[#FFC857]">{PROCEDURES[lang]?.fir?.title}</div>
                  <ul className="text-[11px] text-gray-400 space-y-1.5 list-disc pl-4 leading-relaxed">
                    {PROCEDURES[lang]?.fir?.steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(selectedCategory === 'Medical' || selectedCategory === 'Mental distress') && (
                <div className="p-4 bg-yellow-950/10 border border-[#FFC857]/20 rounded-2xl space-y-2 animate-fade-in">
                  <div className="font-bold text-xs text-[#FFC857]">{PROCEDURES[lang]?.recovery?.title}</div>
                  <ul className="text-[11px] text-gray-400 space-y-1.5 list-disc pl-4 leading-relaxed">
                    {PROCEDURES[lang]?.recovery?.steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* SOS suggestion confirmation modal */}
      <AnimatePresence>
        {showSosSuggestion && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black/75 backdrop-blur-md p-6 rounded-3xl max-w-md w-full border border-red-500/50 space-y-4 shadow-[0_0_30px_rgba(255,59,92,0.35)]"
            >
              <h3 className="text-lg font-black text-[#FF3B5C] flex items-center gap-2">
                <AlertOctagon className="w-6 h-6 animate-pulse" />
                {loc.sosTriggerTitle}
              </h3>
              <p className="text-gray-300 text-xs leading-relaxed">
                {loc.sosTriggerDesc}
              </p>
              
              <div className="flex items-center gap-3 justify-end pt-2">
                <button 
                  onClick={() => setShowSosSuggestion(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold transition-all border border-white/5"
                >
                  {loc.cancelBtnText}
                </button>
                <button 
                  onClick={triggerSOS}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF3B5C] to-red-600 text-white text-xs font-black shadow-lg hover:scale-105 transition-all uppercase"
                >
                  {loc.sosBtnText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
