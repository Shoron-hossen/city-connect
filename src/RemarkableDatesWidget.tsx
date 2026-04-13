import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';

// Data Structure for Remarkable Dates
const remarkableDates = [
  {
    id: 1,
    month: 1, // January
    day: 12,
    type: 'historical',
    title: '2010 Haiti Earthquake',
    summary: 'A catastrophic magnitude 7.0 Mw earthquake struck Haiti, affecting millions of people.',
    safety_tip: 'Identify safe places in each room of your home (under sturdy furniture, against interior walls) to take cover during an earthquake.',
    details: 'The earthquake caused major damage in Port-au-Prince, Jacmel, and other settlements in the region. It remains one of the deadliest natural disasters in modern history, emphasizing the critical need for robust building codes and emergency preparedness in vulnerable regions.'
  },
  {
    id: 2,
    month: 11, // November
    day: 12,
    type: 'historical',
    title: '1970 Bhola Cyclone',
    summary: 'The deadliest tropical cyclone ever recorded, hitting Bangladesh (then East Pakistan).',
    safety_tip: 'Always heed early warning systems. Have an evacuation plan and an emergency kit ready during cyclone season.',
    details: 'The cyclone produced a massive storm surge that flooded much of the low-lying islands of the Ganges Delta. It sparked global changes in disaster response and meteorology alert systems.'
  },
  {
    id: 3,
    month: 3, // March
    day: 22,
    type: 'awareness',
    title: 'World Water Day',
    summary: 'An annual UN observance highlighting the importance of fresh water.',
    safety_tip: 'Conserve water by fixing leaks, taking shorter showers, and practicing water-efficient gardening.',
    details: 'World Water Day advocates for the sustainable management of freshwater resources. It is used to advocate for the 2.2 billion people living without access to safe water and to take action to tackle the global water crisis.'
  },
  {
    id: 4,
    month: 10, // October
    day: 13,
    type: 'awareness',
    title: 'Disaster Risk Reduction Day',
    summary: 'International day celebrating how people and communities are reducing their exposure to disasters.',
    safety_tip: 'Build a family emergency kit containing water, non-perishable food, flashlight, batteries, and a first aid kit.',
    details: 'The UN General Assembly called for the International Day for Disaster Risk Reduction to promote a global culture of risk-awareness and disaster reduction. It highlights the importance of early warning systems and comprehensive risk assessments.'
  }
];

export default function RemarkableDatesWidget() {
  const [todaysEvent, setTodaysEvent] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 0-indexed
    const currentDay = today.getDate();

    const event = remarkableDates.find(d => d.month === currentMonth && d.day === currentDay);
    if (event) {
      setTodaysEvent(event);
    }
  }, []);

  if (!todaysEvent) return null; // Only show if there's an event today

  const isHistorical = todaysEvent.type === 'historical';
  const borderColor = isHistorical ? 'border-red-500/50' : 'border-blue-500/50';
  const bgColor = isHistorical ? 'bg-red-900/10' : 'bg-blue-900/10';
  const iconColor = isHistorical ? 'text-red-400' : 'text-blue-400';
  const tagBg = isHistorical ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={`w-full rounded-2xl border-2 ${borderColor} ${bgColor} backdrop-blur-md shadow-lg overflow-hidden my-6`}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl bg-white/10 ${borderColor} border`}>
              {isHistorical ? <AlertTriangle size={24} className={iconColor} /> : <Calendar size={24} className={iconColor} />}
            </div>
            <div>
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full ${tagBg} mb-2 inline-block`}>
                On This Day
              </span>
              <h3 className="text-2xl font-bold text-white tracking-wide">{todaysEvent.title}</h3>
            </div>
          </div>
        </div>

        <p className="text-gray-300 font-medium text-lg mb-4">{todaysEvent.summary}</p>

        <div className="bg-black/30 border border-white/5 p-4 rounded-xl mb-4 flex items-start gap-3">
          <Info className="flex-shrink-0 text-yellow-400 mt-0.5" size={20} />
          <div>
            <strong className="text-white block mb-1 text-sm uppercase tracking-wide">Safety Tip</strong>
            <p className="text-yellow-100/80 text-sm">{todaysEvent.safety_tip}</p>
          </div>
        </div>

        <button 
          onClick={() => setExpanded(!expanded)}
          className={`w-full py-2 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${isHistorical ? 'bg-red-600/20 hover:bg-red-600/30 text-red-300' : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300'}`}
        >
          {expanded ? (
            <>Hide Details <ChevronUp size={16} /></>
          ) : (
            <>Learn More <ChevronDown size={16} /></>
          )}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-white/10 text-gray-300 text-sm leading-relaxed">
                {todaysEvent.details}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
