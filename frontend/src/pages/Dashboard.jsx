import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import useWebRTC from '../hooks/useWebRTC';
import UserList from '../components/UserList';
import CallModal from '../components/CallModal';
import ActiveCallPanel from '../components/ActiveCallPanel';
import './Dashboard.css';

const Dashboard = () => {
  const { user, token, logout } = useAuth();
  const { socket, connected } = useSocket(token);

  const {
    callStatus,
    setCallStatus,
    isMuted,
    remoteAudioRef,
    startCall,
    handleOffer,
    handleAnswer,
    addIceCandidate,
    endCall,
    toggleMute,
  } = useWebRTC(socket);

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [currentCall, setCurrentCall] = useState(null);
  const [callError, setCallError] = useState('');

  // Ref to track the remote socket id for the current call
  const remoteSocketIdRef = useRef(null);

  // ─── Socket Event Listeners ────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Online users list update
    socket.on('online-users', (users) => {
      setOnlineUsers(users);
    });

    // Call ringing (caller side)
    socket.on('call-ringing', ({ callId, targetUserId, targetName }) => {
      setCallStatus('ringing');
      setCurrentCall({ callId, remoteName: targetName, remoteUserId: targetUserId });
    });

    // Incoming call (receiver side)
    socket.on('incoming-call', ({ callId, callerId, callerName, callerSocketId }) => {
      setIncomingCall({ callId, callerId, callerName, callerSocketId });
    });

    // Call answered (caller side) — start WebRTC
    socket.on('call-answered', ({ callId, receiverSocketId, receiverName }) => {
      remoteSocketIdRef.current = receiverSocketId;
      setCallStatus('connecting');
      // Caller initiates WebRTC offer
      startCall(receiverSocketId);
    });

    // Call rejected
    socket.on('call-rejected', ({ callId, rejectedBy }) => {
      setCallError(`${rejectedBy} declined the call`);
      setCurrentCall(null);
      setCallStatus('idle');
      endCall();
      setTimeout(() => setCallError(''), 4000);
    });

    // Receive WebRTC offer (receiver side)
    socket.on('offer', ({ offer, callerSocketId }) => {
      remoteSocketIdRef.current = callerSocketId;
      handleOffer(offer, callerSocketId);
    });

    // Receive WebRTC answer (caller side)
    socket.on('answer', ({ answer }) => {
      handleAnswer(answer);
    });

    // ICE candidate
    socket.on('ice-candidate', ({ candidate }) => {
      addIceCandidate(candidate);
    });

    // Call ended by remote
    socket.on('call-ended', ({ endedBy, reason }) => {
      endCall();
      setCurrentCall(null);
      setIncomingCall(null);
      remoteSocketIdRef.current = null;
      if (reason === 'disconnect') {
        setCallError(`${endedBy} disconnected`);
      } else {
        setCallError(`${endedBy} ended the call`);
      }
      setTimeout(() => setCallError(''), 4000);
    });

    // Call error
    socket.on('call-error', ({ message }) => {
      setCallError(message);
      setCallStatus('idle');
      endCall();
      setCurrentCall(null);
      setTimeout(() => setCallError(''), 4000);
    });

    return () => {
      socket.off('online-users');
      socket.off('call-ringing');
      socket.off('incoming-call');
      socket.off('call-answered');
      socket.off('call-rejected');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('call-ended');
      socket.off('call-error');
    };
  }, [socket, startCall, handleOffer, handleAnswer, addIceCandidate, endCall, setCallStatus]);

  // ─── Call Actions ──────────────────────────────────────────────
  const handleCallUser = useCallback(
    (targetUser) => {
      if (!socket) return;
      socket.emit('call-user', { targetUserId: targetUser._id });
    },
    [socket]
  );

  const handleAcceptCall = useCallback(() => {
    if (!socket || !incomingCall) return;

    socket.emit('accept-call', {
      callId: incomingCall.callId,
      callerSocketId: incomingCall.callerSocketId,
    });

    remoteSocketIdRef.current = incomingCall.callerSocketId;

    setCurrentCall({
      callId: incomingCall.callId,
      remoteName: incomingCall.callerName,
      remoteUserId: incomingCall.callerId,
    });
    setCallStatus('connecting');
    setIncomingCall(null);
  }, [socket, incomingCall, setCallStatus]);

  const handleRejectCall = useCallback(() => {
    if (!socket || !incomingCall) return;

    socket.emit('reject-call', {
      callId: incomingCall.callId,
      callerSocketId: incomingCall.callerSocketId,
    });

    setIncomingCall(null);
  }, [socket, incomingCall]);

  const handleEndCall = useCallback(() => {
    if (!socket) return;

    socket.emit('end-call', {
      targetSocketId: remoteSocketIdRef.current,
      callId: currentCall?.callId,
    });

    endCall();
    setCurrentCall(null);
    remoteSocketIdRef.current = null;
  }, [socket, currentCall, endCall]);

  // ─── Determine if we're in a call ─────────────────────────────
  const isInCall = callStatus !== 'idle' && currentCall;

  return (
    <div className="dashboard">
      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="url(#gradSB)" strokeWidth="3" fill="none" />
              <path d="M14 16C14 14 16 12 20 12C24 12 26 14 26 16C26 18 24 19 22 20L20 21V24" stroke="url(#gradSB)" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="20" cy="28" r="1.5" fill="url(#gradSB)" />
              <defs>
                <linearGradient id="gradSB" x1="0" y1="0" x2="40" y2="40">
                  <stop stopColor="#6C63FF" />
                  <stop offset="1" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </svg>
            <span>WebCalling</span>
          </div>
          <div className={`connection-badge ${connected ? 'online' : 'offline'}`}>
            <span className="conn-dot"></span>
            {connected ? 'Connected' : 'Offline'}
          </div>
        </div>

        <UserList
          users={onlineUsers}
          currentUserId={user?._id}
          onCallUser={handleCallUser}
          myCallStatus={callStatus}
        />

        <div className="sidebar-footer">
          <div className="current-user">
            <div className="current-user-avatar">
              <span>{user?.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="current-user-info">
              <span className="current-user-name">{user?.name}</span>
              <span className="current-user-email">{user?.email}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={logout} title="Sign out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {callError && (
          <div className="call-error-toast">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {callError}
          </div>
        )}

        {isInCall ? (
          <ActiveCallPanel
            callStatus={callStatus}
            remoteName={currentCall.remoteName}
            isMuted={isMuted}
            onToggleMute={toggleMute}
            onEndCall={handleEndCall}
          />
        ) : (
          <div className="idle-content">
            <div className="idle-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </div>
            <h2>Ready to Call</h2>
            <p>Select a user from the sidebar to start a voice call</p>
          </div>
        )}
      </main>

      {/* Incoming Call Modal */}
      {incomingCall && (
        <CallModal
          callerName={incomingCall.callerName}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
    </div>
  );
};

export default Dashboard;
