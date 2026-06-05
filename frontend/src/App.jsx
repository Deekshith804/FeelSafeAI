import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import StartTrip from './pages/StartTrip';
import Emergency from './pages/Emergency';
import SafeRoute from './pages/SafeRoute';
import Dashboard from './pages/Dashboard';
import CybercrimeMap from './pages/CybercrimeMap';
import AutoFIR from './pages/AutoFIR';
import EmergencyServices from './pages/EmergencyServices';

function App() {
  const [activeTrip, setActiveTripState] = useState(() => {
    const backup = localStorage.getItem('feelsafe_active_trip');
    if (backup) {
      try {
        const parsed = JSON.parse(backup);
        if (parsed && parsed.active) return parsed;
      } catch (e) {
        console.error('Failed to load active trip backup', e);
      }
    }
    return null;
  });

  const setActiveTrip = (trip) => {
    setActiveTripState(trip);
    if (trip) {
      localStorage.setItem('feelsafe_active_trip', JSON.stringify(trip));
    } else {
      localStorage.removeItem('feelsafe_active_trip');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1020] text-white">
      <Navbar />
      <main className="pb-20 md:pb-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/start-trip" element={<StartTrip activeTrip={activeTrip} setActiveTrip={setActiveTrip} />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/safe-route" element={<SafeRoute />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cybercrime-map" element={<CybercrimeMap />} />
          <Route path="/auto-fir" element={<AutoFIR />} />
          <Route path="/emergency-services" element={<EmergencyServices activeTrip={activeTrip} setActiveTrip={setActiveTrip} />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
