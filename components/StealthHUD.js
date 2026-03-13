import React, { useState, useEffect } from 'react';

function StealthHUD({ active }) {
  return (
    <div style={{position:'fixed',bottom:'8px',right:'12px',zIndex:9999}}>
      {active && <span className="silent-watch-indicator" style={{color:'#00bfff',fontWeight:'bold',fontSize:'12px',animation:'blink 1s infinite'}}>SILENT WATCH</span>}
      <style>{`@keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.2;} }`}</style>
    </div>
  );
}

export default StealthHUD;
