// frontend/src/hooks/useWebRTC.js - BULLETPROOF VERSION
import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import SimplePeer from 'simple-peer';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Global singleton to prevent multiple connections
let globalSocket = null;
let globalStream = null;
let connectionInProgress = false;

export const useWebRTC = (meetingId, userId, userName) => {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);

  const peersRef = useRef({});
  const screenStreamRef = useRef(null);
  const isMountedRef = useRef(true);
  const hasJoinedRef = useRef(false);

  // Initialize media devices
  const initializeMedia = useCallback(async () => {
    // Return existing stream if available
    if (globalStream) {
      console.log('✅ Using existing media stream');
      setLocalStream(globalStream);
      setIsConnecting(false);
      return globalStream;
    }

    if (connectionInProgress) {
      console.log('⏳ Media initialization already in progress...');
      return null;
    }

    try {
      connectionInProgress = true;
      console.log('🎥 Requesting camera and microphone...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('✅ Got media stream');
      globalStream = stream;
      
      if (isMountedRef.current) {
        setLocalStream(stream);
        setIsConnecting(false);
      }
      
      connectionInProgress = false;
      return stream;
    } catch (err) {
      console.error('❌ Media access error:', err);
      connectionInProgress = false;
      if (isMountedRef.current) {
        setError('Please allow camera and microphone access');
        setIsConnecting(false);
      }
      return null;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((participant, initiator) => {
    if (!globalStream) {
      console.warn('⚠️ Local stream not ready yet');
      return;
    }

    // Prevent duplicate peer connections
    if (peersRef.current[participant.socketId]) {
      console.log('⚠️ Peer connection already exists for', participant.socketId);
      return;
    }

    console.log(`🔗 Creating peer connection with ${participant.userName} (initiator: ${initiator})`);

    const peer = new SimplePeer({
      initiator,
      trickle: true,
      stream: globalStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    // Handle signal (offer/answer/candidate)
    peer.on('signal', (signal) => {
      if (!globalSocket || !isMountedRef.current) return;
      
      if (signal.type === 'offer') {
        console.log('📤 Sending offer to:', participant.socketId);
        globalSocket.emit('offer', {
          to: participant.socketId,
          offer: signal
        });
      } else if (signal.type === 'answer') {
        console.log('📤 Sending answer to:', participant.socketId);
        globalSocket.emit('answer', {
          to: participant.socketId,
          answer: signal
        });
      } else {
        // ICE candidate
        globalSocket.emit('ice-candidate', {
          to: participant.socketId,
          candidate: signal
        });
      }
    });

    // Handle stream
    peer.on('stream', (remoteStream) => {
      console.log('📹 Received stream from:', participant.userName);
      
      if (!isMountedRef.current) return;
      
      setPeers((prevPeers) => {
        const exists = prevPeers.some((p) => p.socketId === participant.socketId);
        
        if (exists) {
          return prevPeers.map((p) =>
            p.socketId === participant.socketId
              ? { ...p, stream: remoteStream }
              : p
          );
        } else {
          return [
            ...prevPeers,
            {
              ...participant,
              stream: remoteStream,
              peer
            }
          ];
        }
      });
    });

    // Handle errors
    peer.on('error', (err) => {
      console.error('❌ Peer error:', err);
    });

    // Handle connection close
    peer.on('close', () => {
      console.log('🔌 Peer connection closed:', participant.socketId);
    });

    // Store peer reference
    peersRef.current[participant.socketId] = peer;

    // Add to peers state immediately (without stream)
    if (isMountedRef.current) {
      setPeers((prevPeers) => {
        const exists = prevPeers.some((p) => p.socketId === participant.socketId);
        if (!exists) {
          return [...prevPeers, { ...participant, stream: null, peer }];
        }
        return prevPeers;
      });
    }
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!meetingId || !userId || !userName) return;

    // Prevent multiple initializations
    if (hasJoinedRef.current) {
      console.log('⚠️ Already joined meeting, skipping...');
      return;
    }

    hasJoinedRef.current = true;
    isMountedRef.current = true;

    console.log('🔌 Initializing WebRTC connection...');

    // Initialize media first
    initializeMedia().then((stream) => {
      if (!stream || !isMountedRef.current) return;

      // Use existing socket or create new one
      if (globalSocket && globalSocket.connected) {
        console.log('✅ Using existing socket connection');
        return;
      }

      // Create new socket
      console.log('🔌 Creating new Socket.IO connection...');
      
      const socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: false,
        forceNew: true
      });

      globalSocket = socket;

      socket.on('connect', () => {
        console.log('✅ Socket connected:', socket.id);
        
        // Join the meeting ONLY ONCE
        socket.emit('webrtc-join-meeting', {
          meetingId,
          userId,
          userName,
          isAudioEnabled: true,
          isVideoEnabled: true
        });
      });

      socket.on('connect_error', (err) => {
        console.error('❌ Socket connection error:', err);
        if (isMountedRef.current) {
          setError('Failed to connect to server');
        }
      });

      // Handle existing participants
      socket.on('existing-participants', (participants) => {
        console.log('📋 Existing participants:', participants.length);
        
        participants.forEach((participant) => {
          createPeerConnection(participant, true);
        });
      });

      // Handle new user joined
      socket.on('user-joined', (participant) => {
        console.log('👤 User joined:', participant.userName);
        createPeerConnection(participant, false);
      });

      // Handle WebRTC offer
      socket.on('offer', async ({ from, offer }) => {
        console.log('📥 Received offer from:', from);
        
        const peer = peersRef.current[from];
        if (peer) {
          try {
            await peer.signal(offer);
          } catch (err) {
            console.error('Error handling offer:', err);
          }
        }
      });

      // Handle WebRTC answer
      socket.on('answer', async ({ from, answer }) => {
        console.log('📥 Received answer from:', from);
        
        const peer = peersRef.current[from];
        if (peer) {
          try {
            await peer.signal(answer);
          } catch (err) {
            console.error('Error handling answer:', err);
          }
        }
      });

      // Handle ICE candidate
      socket.on('ice-candidate', async ({ from, candidate }) => {
        const peer = peersRef.current[from];
        if (peer) {
          try {
            await peer.signal(candidate);
          } catch (err) {
            console.error('Error handling ICE candidate:', err);
          }
        }
      });

      // Handle user left
      socket.on('user-left', ({ socketId }) => {
        console.log('👋 User left:', socketId);
        
        if (peersRef.current[socketId]) {
          peersRef.current[socketId].destroy();
          delete peersRef.current[socketId];
          
          if (isMountedRef.current) {
            setPeers((prevPeers) =>
              prevPeers.filter((p) => p.socketId !== socketId)
            );
          }
        }
      });

      // Handle media state changes
      socket.on('user-media-state-changed', ({ socketId, isAudioEnabled, isVideoEnabled }) => {
        if (!isMountedRef.current) return;
        
        setPeers((prevPeers) =>
          prevPeers.map((p) =>
            p.socketId === socketId
              ? { ...p, isAudioEnabled, isVideoEnabled }
              : p
          )
        );
      });
    });

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up component...');
      
      isMountedRef.current = false;
      hasJoinedRef.current = false;

      // Destroy all peer connections
      Object.values(peersRef.current).forEach((peer) => {
        try {
          peer.destroy();
        } catch (err) {
          console.error('Error destroying peer:', err);
        }
      });
      peersRef.current = {};

      // DON'T close socket or stream here - they're global
      // They'll be cleaned up when user leaves the page
    };
  }, [meetingId, userId, userName, createPeerConnection, initializeMedia]);

  // Cleanup on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('🧹 Page unloading - cleaning up global resources...');
      
      // Close socket
      if (globalSocket) {
        if (globalSocket.connected) {
          globalSocket.emit('leave-meeting');
          globalSocket.disconnect();
        }
        globalSocket = null;
      }

      // Stop media stream
      if (globalStream) {
        globalStream.getTracks().forEach((track) => track.stop());
        globalStream = null;
      }

      // Stop screen share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (globalStream) {
      const audioTrack = globalStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);

        if (globalSocket && globalSocket.connected) {
          globalSocket.emit('media-state-change', {
            isAudioEnabled: audioTrack.enabled,
            isVideoEnabled
          });
        }
      }
    }
  }, [isVideoEnabled]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (globalStream) {
      const videoTrack = globalStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);

        if (globalSocket && globalSocket.connected) {
          globalSocket.emit('media-state-change', {
            isAudioEnabled,
            isVideoEnabled: videoTrack.enabled
          });
        }
      }
    }
  }, [isAudioEnabled]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });

        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        const screenTrack = screenStream.getVideoTracks()[0];
        
        Object.values(peersRef.current).forEach((peer) => {
          const sender = peer._pc
            ?.getSenders()
            ?.find((s) => s.track && s.track.kind === 'video');
          
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        screenTrack.onended = () => {
          setIsScreenSharing(false);
          
          if (globalStream) {
            const videoTrack = globalStream.getVideoTracks()[0];
            
            Object.values(peersRef.current).forEach((peer) => {
              const sender = peer._pc
                ?.getSenders()
                ?.find((s) => s.track && s.track.kind === 'video');
              
              if (sender) {
                sender.replaceTrack(videoTrack);
              }
            });
          }
        };

        if (globalSocket && globalSocket.connected) {
          globalSocket.emit('start-screen-share', { meetingId });
        }
      } catch (err) {
        console.error('Screen share error:', err);
        setError('Failed to share screen');
      }
    } else {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (globalStream) {
        const videoTrack = globalStream.getVideoTracks()[0];
        
        Object.values(peersRef.current).forEach((peer) => {
          const sender = peer._pc
            ?.getSenders()
            ?.find((s) => s.track && s.track.kind === 'video');
          
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
      }

      setIsScreenSharing(false);

      if (globalSocket && globalSocket.connected) {
        globalSocket.emit('stop-screen-share', { meetingId });
      }
    }
  }, [isScreenSharing, meetingId]);

  // Send chat message
  const sendChatMessage = useCallback((message) => {
    if (globalSocket && globalSocket.connected) {
      globalSocket.emit('chat-message', {
        meetingId,
        message,
        userName
      });
    }
  }, [meetingId, userName]);

  return {
    localStream,
    peers,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isConnecting,
    error,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendChatMessage
  };
};