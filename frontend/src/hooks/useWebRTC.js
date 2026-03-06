import { useRef, useState, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const useWebRTC = (socket) => {
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);

  const [callStatus, setCallStatus] = useState('idle'); // idle | ringing | connecting | active
  const [isMuted, setIsMuted] = useState(false);

  // Get microphone access
  const getMediaStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('Failed to get microphone:', error);
      throw error;
    }
  }, []);

  // Create and configure RTCPeerConnection
  const createPeerConnection = useCallback(
    (targetSocketId) => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Send ICE candidates to the other peer via signaling
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      // When we receive the remote audio stream
      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      // Connection state changes
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setCallStatus('active');
        } else if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed'
        ) {
          setCallStatus('idle');
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setCallStatus('active');
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [socket]
  );

  // Caller: create offer and send it
  const startCall = useCallback(
    async (targetSocketId) => {
      try {
        setCallStatus('connecting');

        const stream = await getMediaStream();
        const pc = createPeerConnection(targetSocketId);

        // Add local audio tracks to the connection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Create and send SDP offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('offer', {
          targetSocketId,
          offer: pc.localDescription,
        });
      } catch (error) {
        console.error('startCall error:', error);
        setCallStatus('idle');
      }
    },
    [socket, getMediaStream, createPeerConnection]
  );

  // Receiver: handle incoming SDP offer, create answer
  const handleOffer = useCallback(
    async (offer, callerSocketId) => {
      try {
        setCallStatus('connecting');

        const stream = await getMediaStream();
        const pc = createPeerConnection(callerSocketId);

        // Add local audio tracks
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Set remote description (the offer)
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Process any queued ICE candidates
        while (iceCandidateQueueRef.current.length > 0) {
          const candidate = iceCandidateQueueRef.current.shift();
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }

        // Create and send SDP answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('answer', {
          targetSocketId: callerSocketId,
          answer: pc.localDescription,
        });
      } catch (error) {
        console.error('handleOffer error:', error);
        setCallStatus('idle');
      }
    },
    [socket, getMediaStream, createPeerConnection]
  );

  // Caller: handle incoming SDP answer
  const handleAnswer = useCallback(async (answer) => {
    try {
      const pc = peerConnectionRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        // Process any queued ICE candidates
        while (iceCandidateQueueRef.current.length > 0) {
          const candidate = iceCandidateQueueRef.current.shift();
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }
    } catch (error) {
      console.error('handleAnswer error:', error);
    }
  }, []);

  // Handle incoming ICE candidate
  const addIceCandidate = useCallback(async (candidate) => {
    try {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Queue candidates until remote description is set
        iceCandidateQueueRef.current.push(candidate);
      }
    } catch (error) {
      console.error('addIceCandidate error:', error);
    }
  }, []);

  // End the call and clean up all resources
  const endCall = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    iceCandidateQueueRef.current = [];
    setCallStatus('idle');
    setIsMuted(false);
  }, []);

  // Toggle microphone mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  return {
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
  };
};

export default useWebRTC;
