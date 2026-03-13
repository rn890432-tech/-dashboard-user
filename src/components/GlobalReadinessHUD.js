import React from 'react';

const GlobalReadinessHUD = ({ tensionLevel }) => {
  const readiness = Math.max(100 - (tensionLevel * 100), 15);
  return (
    <div className="flex justify-between items-center p-2 bg-slate-900/80 border-b border-cyan-500/30">
      <div className="flex gap-4">
        <span className="text-cyan-500 font-bold text-xs uppercase tracking-tighter">System Health: <span className="text-white">OPTIMAL</span></span>
        <span className="text-cyan-500 font-bold text-xs uppercase tracking-tighter">PQC Encryption: <span className="text-green-400">ACTIVE</span></span>
      </div>
      <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden border border-cyan-900">
        <div 
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000" 
          style={{ width: `${readiness}%` }}
        />
      </div>
      <span className="text-[10px] text-cyan-200">DEFCON LEVEL: {tensionLevel > 0.7 ? "2" : "4"}</span>
    </div>
  );
};

export default GlobalReadinessHUD;
