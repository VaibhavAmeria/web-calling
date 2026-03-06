import { useState, useEffect } from 'react';
import './ActiveCallPanel.css';

const ActiveCallPanel = ({
  callStatus,
  remoteName,
  isMuted,
  onToggleMute,
  onEndCall,
}) => {
  const [duration, setDuration] = useState(0);

  // Call timer
  useEffect(() => {
    let interval;
    if (callStatus === 'active') {
      setDuration(0);
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'ringing':
        return 'Ringing...';
      case 'connecting':
        return 'Connecting...';
      case 'active':
        return formatTime(duration);
      default:
        return '';
    }
  };

  return (
    <div className="active-call-panel">
      <div className="call-visual">
        {callStatus === 'active' && (
          <div className="audio-waves">
            <div className="wave"></div>
            <div className="wave"></div>
            <div className="wave"></div>
            <div className="wave"></div>
            <div className="wave"></div>
          </div>
        )}

        <div className={`call-avatar-large ${callStatus === 'ringing' ? 'ringing' : ''}`}>
          <span>{remoteName?.charAt(0).toUpperCase()}</span>
        </div>
      </div>

      <div className="call-info">
        <h2 className="remote-name">{remoteName}</h2>
        <p className={`call-status-text status-${callStatus}`}>
          {callStatus === 'ringing' && (
            <span className="status-dot-anim">
              <span></span>
              <span></span>
              <span></span>
            </span>
          )}
          {getStatusText()}
        </p>
      </div>

      <div className="call-controls">
        <button
          className={`control-btn mute-btn ${isMuted ? 'active' : ''}`}
          onClick={onToggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M17 16.95A7 7 0 015 12m14 0a7 7 0 01-.11 1.23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="1" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M19 10v1a7 7 0 01-14 0v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="18" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          <span>{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button className="control-btn end-btn" onClick={onEndCall} title="End Call">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          <span>End Call</span>
        </button>
      </div>
    </div>
  );
};

export default ActiveCallPanel;
