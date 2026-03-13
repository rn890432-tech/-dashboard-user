import React from 'react';

const AIAnalystTerminal = ({ insights }) => {
  const logs = Array.isArray(insights) ? insights : [];
  return (
    <div className="bg-black border border-cyan-900/50 p-4 font-mono text-xs text-cyan-400 h-48 overflow-y-auto rounded shadow-2xl">
      <div className="flex items-center gap-2 mb-2 border-b border-cyan-900 pb-1">
        <div className="w-2 h-2 bg-cyan-500 animate-pulse rounded-full" />
        <span className="uppercase tracking-widest text-[10px] font-bold">AI SOC Analyst Live Feed</span>
      </div>
      {logs.map((log, i) => (
        <div key={i} className="mb-1 opacity-90 animate-in fade-in slide-in-from-left-2">
          <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log}
        </div>
      ))}
      <div className="mt-2 animate-pulse">_</div>
    </div>
  );
};

export default AIAnalystTerminal;
