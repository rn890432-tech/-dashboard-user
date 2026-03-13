import React from 'react';

function UserActivityMonitorPanel({ users }) {
  return (
    <div className="user-activity-monitor-panel" style={{background:'#222',color:'#fff',padding:'16px',borderRadius:'8px',margin:'16px 0'}}>
      <h4>User Activity Monitor</h4>
      <ul>
        {users.map((u,i)=>(<li key={i}><span style={{color:'#00bfff'}}>{u.name}</span> - <span style={{color:'#888'}}>{u.dept}</span></li>))}
      </ul>
    </div>
  );
}

export default UserActivityMonitorPanel;
