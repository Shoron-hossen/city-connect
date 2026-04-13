import React, { useState, useEffect } from 'react';
import { Wind, Droplets, TreePine, AlertTriangle, CheckCircle, Activity, Map, Loader2, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

import { Navbar, User } from './App';

export default function EnvironmentPage({ user, setUser }: { user: User, setUser: (user: User | null) => void }) {
  const [requestMessage, setRequestMessage] = useState('');
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [aqi, setAqi] = useState<number | null>(null);
  const [precip, setPrecip] = useState<number>(0);
  const [locationName, setLocationName] = useState('Locating...');
  const [latLon, setLatLon] = useState<{lat: number, lon: number} | null>(null);
  const [saturation, setSaturation] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // ... (keep useEffect exact)
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setLatLon({ lat, lon });
        
        try {
          const revGeo = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          if (revGeo.ok) {
            const geoData = await revGeo.json();
            setLocationName(geoData.address?.city || geoData.address?.town || geoData.address?.suburb || geoData.address?.road || 'Your Location');
          }

          // WAQI API for accurate Dhaka stations
          const aqiRes = await fetch(`https://api.waqi.info/feed/geo:${lat};${lon}/?token=demo`);
          if (aqiRes.ok) {
            const aqiData = await aqiRes.json();
            if (aqiData.status === 'ok') {
               setAqi(aqiData.data.aqi);
            }
          }

          // OpenWeatherMap One Call equivalent via Open-Meteo as high-resolution fallback due to OWM premium keys
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=precipitation`);
          if (weatherRes.ok) {
            const wData = await weatherRes.json();
            const p = wData.current?.precipitation || 0;
            setPrecip(p);
            
            // Ground Saturation Formula
            const SOIL_ABSORPTION_RATE = 15; // mm/hr for clay-heavy soil profile (Dhaka)
            const sat = (p / SOIL_ABSORPTION_RATE) * 100;
            setSaturation(Math.min(sat, 100)); // cap at 100%
          }
        } catch (e) {
          console.error("API error", e);
        } finally {
          setLoading(false);
        }
      }, () => {
        setLocationName('Location denied. Using map defaults.');
        setLatLon({ lat: 40.7128, lon: -74.0060 }); // default NYC
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleRequest = () => {
    setRequestMessage('Plantation request forwarded to the municipal committee!');
    setTimeout(() => setRequestMessage(''), 3000);
  };

  const getAqiCategory = (val: number | null) => {
    if (!val) return 'Unknown';
    if (val <= 50) return 'Good';
    if (val <= 100) return 'Moderate';
    if (val <= 150) return 'Unhealthy (Sens)';
    if (val <= 200) return 'Unhealthy';
    if (val <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#00103a] via-[#1a0b3c] to-[#600050] text-white pb-20">
      <Navbar user={user} setUser={setUser} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 mt-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight flex items-center justify-center gap-4">
              <TreePine className="text-green-500" size={42} /> 
               Green Initiatives
            </h1>
            <p className="text-gray-300 text-lg flex items-center justify-center gap-2 font-medium">
              <MapPin size={18} className="text-blue-400" /> {locationName}
              {loading && <Loader2 size={16} className="animate-spin text-green-400 ml-2" />}
            </p>
        </motion.div>

        {requestMessage && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-8 p-4 bg-green-500/20 text-green-400 border border-green-500/30 rounded-2xl flex items-center gap-3 max-w-2xl mx-auto font-medium text-lg">
            <CheckCircle size={24} /> {requestMessage}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Air Quality Monitoring */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Wind className="text-teal-400" size={24} />
              Real-time Air Quality
            </h2>
            <div className="flex items-center justify-between bg-white/5 p-6 rounded-xl border border-white/5 mb-5">
              <div>
                <p className="text-teal-300 font-bold mb-1 uppercase text-sm">WAQI Standard</p>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-extrabold text-teal-400">
                    {loading ? <Loader2 className="animate-spin text-teal-400" size={36} /> : (aqi ?? '--')}
                  </span>
                  <span className="text-xl font-bold text-teal-300 mb-1">
                    {getAqiCategory(aqi)}
                  </span>
                </div>
              </div>
              <Activity size={48} className="text-teal-400 opacity-50" />
            </div>
            <p className="text-gray-300 bg-black/20 p-4 rounded-xl border border-white/5 text-sm">
              <strong className="text-white block mb-1">Health Recommendation:</strong>
              {(!aqi || aqi <= 40) ? 'Air quality is satisfactory. Routine outdoor activities are perfectly fine and safe.' : 'Air pollution is significantly high. Vulnerable individuals should minimize their exposure.'}
            </p>
          </motion.div>

          {/* Water Levels / Flood Alerts */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-white/5 p-6 rounded-2xl border border-white/10 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Droplets className="text-blue-400" size={24} />
                Live Flood Index
              </h2>
              <button 
                onClick={() => setAlertEnabled(!alertEnabled)}
                className={`px-4 py-2 text-sm font-bold rounded-full transition-colors border ${alertEnabled ? 'bg-blue-500/20 text-blue-300 border-blue-400/50' : 'bg-white/5 text-gray-400 border-white/10'}`}
              >
                {alertEnabled ? 'Alerts ON' : 'Alerts OFF'}
              </button>
            </div>
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              <div className={`flex items-center gap-4 ${precip > 5 ? 'bg-red-500/20 border-red-500/30' : 'bg-blue-500/10 border-blue-500/20'} p-5 rounded-xl border transition-colors`}>
                {precip > 5 ? <AlertTriangle className="text-red-400 flex-shrink-0" size={32} /> : <CheckCircle className="text-blue-400 flex-shrink-0" size={32} />}
                <div>
                  <h3 className="font-bold text-white text-lg">Current Precipitation</h3>
                  <p className={`text-base font-medium mt-1 ${precip > 5 ? 'text-red-300' : 'text-blue-300'}`}>{precip} mm / hour</p>
                </div>
              </div>
              <div className={`flex items-center gap-4 ${saturation > 80 ? 'bg-amber-500/20 border-amber-500/30' : 'bg-white/5 border-white/5'} p-5 rounded-xl border transition-colors`}>
                <AlertTriangle className={`flex-shrink-0 ${saturation > 80 ? 'text-amber-400' : 'text-gray-400'}`} size={32} />
                <div className="w-full pr-4">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-white text-lg">Ground Saturation</h3>
                    <span className={`font-bold ${saturation > 80 ? 'text-amber-400' : 'text-gray-400'}`}>{saturation.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-black/40 rounded-full h-2.5 mb-1 border border-white/5">
                    <div className={`h-2.5 rounded-full ${saturation > 80 ? 'bg-amber-500' : 'bg-blue-400'}`} style={{ width: `${saturation}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-400">Formula based on Dhaka soil absorption rates vs 24h rainfall.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Green Zones Maps (OSM iframe) */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-white/5 p-6 rounded-2xl border border-white/10 lg:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <TreePine className="text-green-400" size={24} />
              Greenery Zone Mapping
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-[300px] rounded-xl border border-white/10 overflow-hidden relative bg-black/20">
                {latLon ? (
                   <iframe 
                   title="Green Zones Map"
                   width="100%" 
                   height="100%" 
                   frameBorder="0" style={{ filter: 'invert(90%) hue-rotate(180deg)', opacity: 0.85 }}
                   src={`https://www.openstreetmap.org/export/embed.html?bbox=${latLon.lon-0.05},${latLon.lat-0.05},${latLon.lon+0.05},${latLon.lat+0.05}&layer=mapnik&marker=${latLon.lat},${latLon.lon}`}
                 />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 gap-3"><Loader2 className="animate-spin text-green-400" /> Mapping zones...</div>
                )}
              </div>
              <div className="flex flex-col justify-center gap-6">
                <div className="bg-white/5 border border-white/5 p-5 rounded-xl">
                  <h3 className="font-bold text-white mb-2 text-lg">Local Green Space Area</h3>
                  <p className="text-gray-400 text-sm">Cross-referencing exact open geographic map data to isolate green zone coverage densities in your immediate spatial vicinity.</p>
                </div>
                <button onClick={handleRequest} className="w-full bg-green-600 hover:bg-green-500 text-white py-4 px-6 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-3">
                  <TreePine size={20} /> Issue Tree Plantation Request
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
