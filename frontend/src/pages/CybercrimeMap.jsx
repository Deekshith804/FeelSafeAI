import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { ShieldAlert, Send, RefreshCw, Layers, Calendar, Clock, Globe, ArrowRight, UserPlus, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCybercrimeHotspots,
  getCybercrimeForecast,
  getCyberThreatFeed,
  getCyberGovAlerts,
  submitCyberReport
} from '../services/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function CybercrimeMap() {
  const [hotspots, setHotspots] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [threatFeed, setThreatFeed] = useState([]);
  const [advisories, setAdvisories] = useState([]);
  
  const [viewMode, setViewMode] = useState('current'); // 'current' | 'forecast24' | 'forecast48'
  const [loading, setLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form states
  const [reportType, setReportType] = useState('UPI Fraud');
  const [reportDesc, setReportDesc] = useState('');
  const [reportCity, setReportCity] = useState('Delhi');
  const [reportLat, setReportLat] = useState(28.6315);
  const [reportLon, setReportLon] = useState(77.2167);
  const [formSuccess, setFormSuccess] = useState(null);

  const mapCenter = [22.5958, 80.2636]; // Centered on India

  const loadData = async () => {
    setLoading(true);
    try {
      const [hRes, tRes, aRes] = await Promise.all([
        getCybercrimeHotspots(),
        getCyberThreatFeed(15),
        getCyberGovAlerts(5)
      ]);
      if (hRes.success) setHotspots(hRes.hotspots);
      if (tRes.success) setThreatFeed(tRes.threats);
      if (aRes.success) setAdvisories(aRes.advisories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForecastToggle = async (mode) => {
    setViewMode(mode);
    if (mode === 'current') {
      loadData();
    } else {
      setLoading(true);
      const hours = mode === 'forecast24' ? 24 : 48;
      try {
        const res = await getCybercrimeForecast(hours);
        if (res.success) setForecast(res.forecast);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      incident_type: reportType,
      description: reportDesc,
      lat: Number(reportLat),
      lon: Number(reportLon),
      location_name: reportCity,
      severity: reportDesc.length > 50 ? 'HIGH' : 'MEDIUM'
    };
    try {
      const res = await submitCyberReport(payload);
      if (res.success) {
        setFormSuccess(`Report submitted successfully! Ticket: ${res.tracking_id}`);
        setReportDesc('');
        setTimeout(() => {
          setShowReportModal(false);
          setFormSuccess(null);
          loadData();
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      getCyberThreatFeed(15).then(res => {
        if (res?.success) setThreatFeed(res.threats);
      });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (score) => {
    if (score >= 0.70) return '#FF3B5C'; // Red
    if (score >= 0.50) return '#FFC857'; // Amber/Yellow
    return '#00E5FF'; // Cyan
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-8 h-8 text-[#00E5FF]" />
            <h1 className="text-3xl font-black">Cybercrime Hotspot Intelligence</h1>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Real-time cybersecurity maps, predictive forecasting, & official advisories integration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadData} 
            disabled={loading} 
            className="p-2.5 glass rounded-2xl hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button 
            onClick={() => setShowReportModal(true)} 
            className="px-5 py-2.5 rounded-2xl bg-[#00E5FF] text-[#0B1020] font-bold hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.4)]"
          >
            <Send className="w-4 h-4" /> Submit Scam Report
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Panel: Real-time Intel Feed */}
        <div className="glass p-5 rounded-3xl lg:col-span-1 flex flex-col h-[600px] border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF3B5C] rounded-full mix-blend-screen filter blur-[60px] opacity-10" />
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B5C] animate-pulse"></span>
            Live Threat Feed
          </h2>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            <AnimatePresence>
              {threatFeed.map((threat) => (
                <motion.div 
                  key={threat.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-black/40 rounded-2xl border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs px-2 py-0.5 rounded-full" 
                          style={{ backgroundColor: `${threat.color}20`, color: threat.color }}>
                      {threat.type}
                    </span>
                    <span className="text-[10px] text-gray-500">{threat.time}</span>
                  </div>
                  <p className="text-xs text-gray-300 mt-1.5 font-medium">{threat.description}</p>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5 text-[10px] text-gray-500">
                    <span>Source: {threat.source}</span>
                    <span className="font-bold text-[#00FF9D]">{threat.city}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Center Panel: Map + Controls */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          {/* Layer toggles */}
          <div className="flex items-center gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5 self-start">
            <button 
              onClick={() => handleForecastToggle('current')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${viewMode === 'current' ? 'bg-[#00E5FF] text-[#0B1020]' : 'text-gray-400 hover:text-white'}`}
            >
              <Layers className="w-3.5 h-3.5" /> Current Heatmap
            </button>
            <button 
              onClick={() => handleForecastToggle('forecast24')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${viewMode === 'forecast24' ? 'bg-[#7C4DFF] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Clock className="w-3.5 h-3.5" /> 24h Prediction
            </button>
            <button 
              onClick={() => handleForecastToggle('forecast48')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${viewMode === 'forecast48' ? 'bg-[#7C4DFF] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Calendar className="w-3.5 h-3.5" /> 48h Prediction
            </button>
          </div>

          {/* Leaflet Map view container */}
          <div className="relative h-[535px] rounded-3xl overflow-hidden border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
            <MapContainer 
              center={mapCenter} 
              zoom={5} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer 
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://openstreetmap.org/copyright">OSM</a>'
              />

              {viewMode === 'current' ? (
                hotspots.map((h) => (
                  <Circle 
                    key={h.id}
                    center={[h.lat, h.lon]}
                    radius={h.risk_score * 45000}
                    pathOptions={{
                      color: getRiskColor(h.risk_score),
                      fillColor: getRiskColor(h.risk_score),
                      fillOpacity: 0.35,
                      weight: 1.5
                    }}
                  >
                    <Popup>
                      <div className="p-1 space-y-1.5 text-xs text-gray-200">
                        <div className="font-bold text-[#00E5FF] text-sm">{h.zone}</div>
                        <div><b>Risk Score:</b> {h.risk_score * 10} / 10 ({h.risk_label})</div>
                        <div><b>Threat Vectors:</b> {h.crime_types.join(', ')}</div>
                        <div><b>Active incidents:</b> {h.incident_count} reports</div>
                        <div className="text-[10px] text-gray-500 mt-1">Last Updated: {h.last_updated}</div>
                      </div>
                    </Popup>
                  </Circle>
                ))
              ) : (
                forecast.map((f) => (
                  <Circle 
                    key={f.id}
                    center={[f.lat, f.lon]}
                    radius={f.peak_risk * 50000}
                    pathOptions={{
                      color: '#7C4DFF',
                      fillColor: '#7C4DFF',
                      fillOpacity: 0.28,
                      weight: 1.5,
                      dashArray: "5 5"
                    }}
                  >
                    <Popup>
                      <div className="p-1 space-y-1.5 text-xs">
                        <div className="font-bold text-[#7C4DFF] text-sm">{f.zone}</div>
                        <div><b>Peak Risk:</b> {(f.peak_risk * 10).toFixed(1)} / 10 ({f.risk_label})</div>
                        <div><b>Avg Risk Score:</b> {(f.avg_risk * 10).toFixed(1)} / 10</div>
                        <div><b>Peak Risk Time:</b> {f.peak_hour}</div>
                        <div><b>Types:</b> {f.crime_types.join(', ')}</div>
                      </div>
                    </Popup>
                  </Circle>
                ))
              )}
            </MapContainer>

            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 z-[1000] glass px-3.5 py-2.5 rounded-2xl border border-white/10 text-xs space-y-2 pointer-events-none">
              <div className="font-bold text-white mb-1">Risk Intensity</div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF3B5C]" />
                <span>Critical / High Danger</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FFC857]" />
                <span>Medium Danger</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#00E5FF]" />
                <span>Low Risk Zone</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Official Advisories integration */}
        <div className="glass p-5 rounded-3xl lg:col-span-1 flex flex-col h-[600px] border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-[#00E5FF] rounded-full mix-blend-screen filter blur-[60px] opacity-10" />
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-white">
            <Globe className="w-5 h-5 text-[#00E5FF]" />
            National Portal Intel
          </h2>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {advisories.map((adv) => (
              <div key={adv.id} className="p-3.5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1.5">
                  <span className="font-semibold text-[#FFC857]">{adv.issued_by}</span>
                  <span>{adv.advisory_date}</span>
                </div>
                <h3 className="font-bold text-xs text-white leading-snug">{adv.title}</h3>
                <p className="text-[11px] text-gray-400 mt-1.5 line-clamp-3">{adv.description}</p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[10px]">
                  <span className="text-gray-500">States: {adv.affected_states.join(', ')}</span>
                  <span className="px-2 py-0.5 rounded-md bg-[#FF3B5C]/20 text-[#FF3B5C] font-bold">{adv.severity}</span>
                </div>
              </div>
            ))}
          </div>

          <a 
            href="https://cybercrime.gov.in" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-4 p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs font-bold text-[#00E5FF] text-center flex items-center justify-center gap-1.5"
          >
            Visit Official cybercrime.gov.in <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Citizen Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass w-full max-w-lg rounded-3xl p-6 border border-white/10 space-y-4 relative"
          >
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5.5 h-5.5 text-[#00E5FF]" />
              Submit Incident Report
            </h2>
            <p className="text-gray-400 text-xs">
              Provide scam details to dynamically update the cybercrime hotspot heatmap layer.
            </p>

            {formSuccess ? (
              <div className="p-4 bg-[#00FF9D]/15 border border-[#00FF9D]/20 text-[#00FF9D] font-bold text-sm text-center rounded-2xl animate-pulse">
                {formSuccess}
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-semibold">Incident Type</label>
                    <select 
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-[#00E5FF]"
                    >
                      <option value="UPI Fraud">UPI Fraud</option>
                      <option value="Phishing">Phishing Link</option>
                      <option value="OTP Scam">OTP Scam</option>
                      <option value="Fake Calls">Fake Call/SMS</option>
                      <option value="Identity Theft">Identity Theft</option>
                      <option value="Social Media Fraud">Social Media Scam</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-semibold">City/Location</label>
                    <input 
                      type="text" required value={reportCity}
                      onChange={(e) => setReportCity(e.target.value)}
                      placeholder="e.g. Connaught Place, Delhi"
                      className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-[#00E5FF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-semibold">Latitude</label>
                    <input 
                      type="number" step="0.0001" required value={reportLat}
                      onChange={(e) => setReportLat(e.target.value)}
                      className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-[#00E5FF]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-semibold">Longitude</label>
                    <input 
                      type="number" step="0.0001" required value={reportLon}
                      onChange={(e) => setReportLon(e.target.value)}
                      className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-[#00E5FF]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 font-semibold">Incident Description</label>
                  <textarea 
                    rows="3" required value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    placeholder="Provide incident details, phone numbers, or links involved..."
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-white outline-none focus:border-[#00E5FF] resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button 
                    type="button" 
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 font-bold border border-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 rounded-xl bg-[#00E5FF] text-[#0B1020] font-bold hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
