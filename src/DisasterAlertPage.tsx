import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Activity, BellRing, MapPin, Radio, Loader2, Volume2, ShieldAlert } from 'lucide-react';
import { Navbar, User } from './App';
import RemarkableDatesWidget from './RemarkableDatesWidget';
import { io } from 'socket.io-client';

export default function DisasterAlertPage({ user, setUser }: { user: User, setUser: (user: User | null) => void }) {
  const [earthquakes, setEarthquakes] = useState<any[]>([]);
  const [localQuakes, setLocalQuakes] = useState<any[]>([]);
  const [floodStatus, setFloodStatus] = useState<any>({ status: 'analyzing', basins: 'Connecting...' });
  const [loading, setLoading] = useState(true);
  const [systemActive, setSystemActive] = useState(true);
  const [lastAlert, setLastAlert] = useState<string | null>(null);

  useEffect(() => {
    // Connect to Socket.IO backend
    const socket = io();

    socket.on('earthquake_update', (data) => {
      setEarthquakes(data.all || []);
      setLocalQuakes(data.local || []);
      setLoading(false);

      // Trigger Alert Sound if any NEW local quakes are detected within 1000km
      if (data.local && data.local.length > 0) {
        const latestId = data.local[0].id;
        if (latestId !== lastAlert) {
          setLastAlert(latestId);
          playAlertSound();
        }
      }
    });

    socket.on('flood_update', (data) => {
      setFloodStatus(data);
    });

    socket.on('emergency_alert', (data) => {
       console.log("🚨 EMERGENCY PUSH:", data);
       playAlertSound();
    });

    return () => {
      socket.disconnect();
    };
  }, [lastAlert]);

  const playAlertSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
      audio.play();
    } catch (e) {
      console.warn("Audio playback inhibited or failed.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#00103a] via-[#1a0b3c] to-[#600050] text-white pb-20">
      <Navbar user={user} setUser={setUser} />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 mt-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight flex items-center justify-center gap-4">
              <BellRing className="text-red-500 animate-pulse" size={42} /> 
               Disaster Alert System
            </h1>
            <p className="text-gray-300 text-lg flex items-center justify-center gap-2 font-medium">
              <Radio size={18} className="text-orange-400" /> Professional Socket.IO Live Monitoring
            </p>
        </motion.div>

        {localQuakes.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-6 bg-red-600/20 border-2 border-red-500 rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse"
          >
            <ShieldAlert size={60} className="text-red-500" />
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Regional Threat Detected</h2>
              <p className="text-red-200 text-lg">Seismic activity detected within 1000km of Dhaka. Review active coordinates below.</p>
            </div>
            <button className="bg-red-600 px-6 py-2 rounded-xl font-bold hover:bg-red-500 transition-colors ml-auto">VIEW DETAILS</button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/5 p-6 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xl text-white flex items-center gap-2">
                  <Activity className="text-green-400" /> Backend Sync
                </h3>
                <p className="text-sm text-gray-400 mt-1">Socket connection status: Connected</p>
              </div>
              <Volume2 className="text-gray-400 hover:text-white cursor-pointer" size={24} onClick={playAlertSound} />
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-white/5 p-6 rounded-2xl border border-white/10 min-h-[500px]">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                 <AlertTriangle className="text-orange-400" size={24}/>
                 USGS Live Feed (Dhaka Scope)
              </h2>
              <div className="space-y-4">
                {loading ? (
                   <div className="flex flex-col justify-center items-center py-20 gap-3 text-gray-400">
                       <Loader2 className="animate-spin text-orange-400" size={32} /> 
                       <span>Waiting for socket stream...</span>
                   </div>
                ) : earthquakes.length === 0 ? (
                   <div className="text-center text-gray-400 py-12 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center gap-3">
                       <Activity size={32} className="text-green-500" />
                       No significant events globally in the last hour.
                   </div>
                ) : (
                  <>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2">Top Global Events</h3>
                    {earthquakes.slice(0, 5).map((q, i) => {
                      // Check if this specific quake is local for highlighting
                      const isLocal = localQuakes.some(l => l.id === q.id);
                      return (
                        <div key={q.id || i} className={`flex justify-between items-center p-4 rounded-xl border ${isLocal ? 'bg-red-500/20 border-red-500/40' : 'bg-white/5 border-white/5 hover:bg-white/10'} transition-all`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl font-bold ${q.properties.mag > 4 ? 'bg-red-500/30 text-red-400 border border-red-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}`}>
                               Mag {parseFloat(q.properties.mag).toFixed(1)}
                            </div>
                            <div>
                              <div className="font-bold text-white text-md">{q.properties.place}</div>
                              {isLocal && (
                                <div className="text-[10px] text-red-400 font-bold uppercase mt-0.5">Near Dhaka ({Math.round(q._distanceKm || 0)}km)</div>
                              )}
                              <div className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                                <MapPin size={12} /> {new Date(q.properties.time).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </motion.div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white ml-2">Historical Context</h2>
            <div className="-mt-6">
               <RemarkableDatesWidget />
            </div>
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-white/5 p-6 rounded-2xl border border-white/10">
               <h3 className="font-bold text-white text-lg mb-3 flex items-center justify-between">
                 Google Flood Forecast
                 <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full uppercase tracking-widest font-bold">Live Data</span>
               </h3>
               <div className="bg-black/30 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center gap-4 mb-4">
                    <Activity size={32} className="text-blue-500 animate-pulse" />
                    <div>
                      <div className="font-bold text-white uppercase text-sm tracking-wide">Status: {floodStatus.status}</div>
                      <p className="text-xs text-blue-300">Region: Greater Dhaka Watershed</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-300 leading-relaxed bg-white/5 p-4 rounded-xl">
                    {floodStatus.basins}
                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] uppercase font-bold text-gray-500">
                      <span>Upcoming Forecast (Next 72h)</span>
                      <span className="text-green-500">Normal Range</span>
                    </div>
                  </div>
               </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
