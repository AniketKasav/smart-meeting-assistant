// frontend/src/pages/MeetingRoom.jsx - DEEPGRAM ONLY (Assembly.ai removed)
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff,
  MessageSquare, Users, Settings, Maximize2, Grid3x3, LayoutGrid,
  Copy, CheckCircle2, Send, Sparkles, FileText, X, Loader2
} from 'lucide-react';
import io from 'socket.io-client';
import SimplePeer from 'simple-peer';
import VideoTile from '../components/VideoCall/VideoTile';
import LiveSubtitles from '../components/LiveSubtitles';
import { meetingsAPI } from '../services/api';

const SOCKET_URL = 'http://localhost:4000';

// GLOBAL SINGLETONS - PREVENT MULTIPLE CONNECTIONS
let globalSocket = null;
let globalStream = null;
let isInitializing = false;

const MeetingRoom = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  
  console.log('🎬 MeetingRoom component mounted, meetingId:', meetingId);
  
  // User info
  const userId = useRef(`user_${Date.now()}`).current;
  const userName = useRef('Guest User').current;

  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState(null);

  const [meeting, setMeeting] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Live transcription state (Deepgram)
  const [liveTranscript, setLiveTranscript] = useState([]);
  const [isLiveTranscriptionEnabled, setIsLiveTranscriptionEnabled] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [partialText, setPartialText] = useState("");
  const liveTranscriptionEnabledRef = useRef(false);
  
  // Audio recording state
  const isRecordingRef = useRef(false);
  const audioContextRef = useRef(null);
  const audioProcessorRef = useRef(null);
  
  const peersRef = useRef({});
  const hasInitialized = useRef(false);
  const chatEndRef = useRef(null);

  // Initialize WebRTC
  useEffect(() => {
    if (hasInitialized.current || isInitializing) {
      console.log('⚠️ Already initializing, skipping...');
      return;
    }

    if (!meetingId) {
      console.log('⚠️ No meetingId, skipping initialization');
      return;
    }

    hasInitialized.current = true;
    isInitializing = true;

    console.log('🚀 Starting WebRTC initialization...');

    const initializeWebRTC = async () => {
      try {
        // Step 1: Get media stream
        if (!globalStream) {
          console.log('🎥 Requesting camera and microphone...');
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 1
            }
          });
          globalStream = stream;
          console.log('✅ Got media stream');
        }

        setLocalStream(globalStream);
        setIsConnecting(false);

        // Auto-enable live transcription
        setIsLiveTranscriptionEnabled(true);
        liveTranscriptionEnabledRef.current = true;
        console.log('🎙️ Live transcription auto-enabled');

        // Start recording
        startRecording();

        // Step 2: Connect to Socket.IO
        if (!globalSocket || !globalSocket.connected) {
          console.log('🔌 Connecting to Socket.IO...');
          
          globalSocket = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnection: false
          });

          globalSocket.on('connect', () => {
            console.log('✅ Socket connected:', globalSocket.id);
            
            // Join meeting
            globalSocket.emit('webrtc-join-meeting', {
              meetingId,
              userId,
              userName,
              isAudioEnabled: true,
              isVideoEnabled: true
            });

            // Start Deepgram live transcription
            console.log('🎤 Starting Deepgram live transcription...');
            globalSocket.emit('start-live-transcription', { meetingId });
          });

          globalSocket.on('connect_error', (err) => {
            console.error('❌ Socket error:', err);
            setError('Connection failed');
          });

          // Handle existing participants
          globalSocket.on('existing-participants', (participants) => {
            console.log('📋 Existing participants:', participants.length);
            participants.forEach((p) => createPeer(p, true));
          });

          // Handle new user
          globalSocket.on('user-joined', (participant) => {
            console.log('👤 New user:', participant.userName);
            createPeer(participant, false);
          });

          // Handle offers
          globalSocket.on('offer', ({ from, offer }) => {
            console.log('📥 Offer from:', from);
            const peer = peersRef.current[from];
            if (peer) peer.signal(offer);
          });

          // Handle answers
          globalSocket.on('answer', ({ from, answer }) => {
            console.log('📥 Answer from:', from);
            const peer = peersRef.current[from];
            if (peer) peer.signal(answer);
          });

          // Handle ICE candidates
          globalSocket.on('ice-candidate', ({ from, candidate }) => {
            const peer = peersRef.current[from];
            if (peer) peer.signal(candidate);
          });

          // Handle user left
          globalSocket.on('user-left', ({ socketId }) => {
            console.log('👋 User left:', socketId);
            if (peersRef.current[socketId]) {
              peersRef.current[socketId].destroy();
              delete peersRef.current[socketId];
              setPeers((prev) => prev.filter((p) => p.socketId !== socketId));
            }
          });

          // Handle meeting ended by host
          globalSocket.on('meeting-ended', ({ message }) => {
            alert(message || 'The meeting has ended');
            
            if (globalStream) {
              globalStream.getTracks().forEach((t) => t.stop());
            }
            Object.values(peersRef.current).forEach((peer) => peer.destroy());
            peersRef.current = {};
            
            globalSocket = null;
            globalStream = null;
            hasInitialized.current = false;
            isInitializing = false;
            
            navigate('/dashboard');
          });

          // Handle force leave
          globalSocket.on('force-leave', () => {
            if (globalStream) {
              globalStream.getTracks().forEach((t) => t.stop());
            }
            Object.values(peersRef.current).forEach((peer) => peer.destroy());
            peersRef.current = {};
            
            navigate('/dashboard');
          });

          // ✅ Deepgram live transcript listener
          globalSocket.on("live-transcript", (data) => {
            if (data.type === "partial") {
              setPartialText(data.text);
            }

            if (data.type === "final") {
              setLiveTranscript(prev => [...prev, {
                id: `${Date.now()}`,
                text: data.text,
                timestamp: data.timestamp,
                confidence: data.confidence
              }]);
              
              setPartialText("");
            }
          });

          globalSocket.on('live-transcript-error', (error) => {
            console.error('❌ Live transcription error:', error);
            setIsTranscribing(false);
          });

          globalSocket.on('live-transcription-status', ({ enabled, userName }) => {
            console.log(`🎙️ ${userName} ${enabled ? 'enabled' : 'disabled'} live transcription`);
          });
        }

        isInitializing = false;

      } catch (err) {
        console.error('❌ WebRTC initialization error:', err);
        setError(err.message);
        setIsConnecting(false);
        isInitializing = false;
        hasInitialized.current = false;
      }
    };

    initializeWebRTC();

    // Cleanup
    return () => {
      console.log('🧹 Component unmounting...');
      
      if (globalSocket) {
        globalSocket.off('meeting-ended');
        globalSocket.off('force-leave');
      }
      
      Object.values(peersRef.current).forEach((peer) => {
        try {
          peer.destroy();
        } catch (e) {}
      });
      peersRef.current = {};
    };
  }, [meetingId, userId, userName]);

  // Create peer connection
  const createPeer = (participant, initiator) => {
    if (!globalStream) return;
    if (peersRef.current[participant.socketId]) {
      console.log('⚠️ Peer exists:', participant.socketId);
      return;
    }

    console.log('🔗 Creating peer:', participant.userName, 'initiator:', initiator);

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

    peer.on('signal', (signal) => {
      if (!globalSocket) return;
      
      if (signal.type === 'offer') {
        globalSocket.emit('offer', { to: participant.socketId, offer: signal });
      } else if (signal.type === 'answer') {
        globalSocket.emit('answer', { to: participant.socketId, answer: signal });
      } else {
        globalSocket.emit('ice-candidate', { to: participant.socketId, candidate: signal });
      }
    });

    peer.on('stream', (remoteStream) => {
      console.log('📹 Got stream from:', participant.userName);
      setPeers((prev) => {
        const exists = prev.find((p) => p.socketId === participant.socketId);
        if (exists) {
          return prev.map((p) =>
            p.socketId === participant.socketId ? { ...p, stream: remoteStream } : p
          );
        }
        return [...prev, { ...participant, stream: remoteStream, peer }];
      });
    });

    peer.on('error', (err) => console.error('Peer error:', err));

    peersRef.current[participant.socketId] = peer;
    setPeers((prev) => {
      if (prev.find((p) => p.socketId === participant.socketId)) return prev;
      return [...prev, { ...participant, stream: null, peer }];
    });
  };

  // Cleanup on page unload
  useEffect(() => {
    const cleanup = () => {
      console.log('🧹 Page unloading...');
      if (globalSocket && globalSocket.connected) {
        globalSocket.emit('leave-meeting');
        globalSocket.disconnect();
      }
      if (globalStream) {
        globalStream.getTracks().forEach((t) => t.stop());
      }
      globalSocket = null;
      globalStream = null;
      isInitializing = false;
      hasInitialized.current = false;
    };

    window.addEventListener('beforeunload', cleanup);
    return () => window.removeEventListener('beforeunload', cleanup);
  }, []);

  // Load meeting data
  useEffect(() => {
    if (meetingId) {
      meetingsAPI.getMeeting(meetingId)
        .then((res) => res.data.success && setMeeting(res.data.meeting))
        .catch((err) => console.error('Failed to load meeting:', err));
    }
  }, [meetingId]);

  // Auto-scroll live transcript
  useEffect(() => {
    if (liveTranscript.length > 0) {
      const transcriptContent = document.querySelector('.live-transcript-content');
      if (transcriptContent) {
        transcriptContent.scrollTop = transcriptContent.scrollHeight;
      }
    }
  }, [liveTranscript]);

  // Controls
  const toggleAudio = () => {
    if (globalStream) {
      const track = globalStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsAudioEnabled(track.enabled);
        if (globalSocket) {
          globalSocket.emit('media-state-change', {
            isAudioEnabled: track.enabled,
            isVideoEnabled
          });
        }

        if (!track.enabled && window.meetingMediaRecorder && window.meetingMediaRecorder.state === 'recording') {
          window.meetingMediaRecorder.stop();
          console.log('🛑 Recording stopped due to audio mute');
        } else if (track.enabled && (!window.meetingMediaRecorder || window.meetingMediaRecorder.state === 'inactive')) {
          console.log('🔄 Restarting recording due to audio unmute');
          startRecording();
        }
      }
    }
  };

  const toggleVideo = () => {
    if (globalStream) {
      const track = globalStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsVideoEnabled(track.enabled);
        if (globalSocket) {
          globalSocket.emit('media-state-change', {
            isAudioEnabled,
            isVideoEnabled: track.enabled
          });
        }
      }
    }
  };

  // Audio level detection
  const checkAudioLevel = (buffer) => {
    let sum = 0;
    let peaks = 0;
    
    for (let i = 0; i < buffer.length; i++) {
      const value = buffer[i];
      sum += value * value;
      
      if (Math.abs(value) > 0.1) {
        peaks++;
      }
    }
    
    const rms = Math.sqrt(sum / buffer.length);
    const peakRatio = peaks / buffer.length;
    const hasSignificantSpeech = rms > 0.03 && peakRatio > 0.01;
    
    return {
      hasSpeech: hasSignificantSpeech,
      rms: rms,
      peakRatio: peakRatio
    };
  };

  // Convert AudioBuffer to WAV
  const audioBufferToWav = (audioBuffer) => {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const data = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      data.push(audioBuffer.getChannelData(i));
    }

    const interleaved = new Float32Array(audioBuffer.length * numChannels);
    for (let src = 0, dst = 0; src < audioBuffer.length; src++) {
      for (let channel = 0; channel < numChannels; channel++) {
        interleaved[dst++] = data[channel][src];
      }
    }

    const dataLength = interleaved.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    const volume = 1;
    let offset = 44;
    for (let i = 0; i < interleaved.length; i++) {
      let sample = Math.max(-1, Math.min(1, interleaved[i]));
      sample = sample * 0x7FFF * volume;
      view.setInt16(offset, sample, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  // Start recording
  const startRecording = () => {
    if (!isAudioEnabled) {
      console.warn('⚠️ Audio is disabled - skipping recording');
      alert('Please enable your microphone before starting the meeting.');
      return;
    }

    if (!globalStream) {
      console.log('⚠️ No media stream available for recording');
      return;
    }

    try {
      console.log('🎙️ Starting audio recording...');
      
      isRecordingRef.current = true;
      let chunkIndex = 0;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      audioContextRef.current = audioContext;
      
      const audioStream = new MediaStream(globalStream.getAudioTracks());
      const source = audioContext.createMediaStreamSource(audioStream);
      
      const highpassFilter = audioContext.createBiquadFilter();
      highpassFilter.type = 'highpass';
      highpassFilter.frequency.value = 100;
      highpassFilter.Q.value = 0.7;
      
      const lowpassFilter = audioContext.createBiquadFilter();
      lowpassFilter.type = 'lowpass';
      lowpassFilter.frequency.value = 7000;
      lowpassFilter.Q.value = 0.7;
      
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -40;
      compressor.knee.value = 30;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
      audioProcessorRef.current = processor;
      
      let recordingBuffer = [];
      let recordingLength = 0;
      const recordingDuration = 2;
      const samplesPerChunk = audioContext.sampleRate * recordingDuration;
      
      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // ✅ Send audio to Deepgram for live transcription
        if (liveTranscriptionEnabledRef.current && globalSocket && globalSocket.connected) {
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const clamped = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
          }
          globalSocket.emit('deepgram-audio', pcm16.buffer);
        }
        
        recordingBuffer.push(new Float32Array(inputData));
        recordingLength += inputData.length;
        
        if (recordingLength >= samplesPerChunk) {
          processAudioChunk();
        }
      };
      
      const processAudioChunk = async () => {
        if (recordingLength === 0) return;
        
        const currentChunkIndex = chunkIndex++;
        
        try {
          const combinedBuffer = new Float32Array(recordingLength);
          let offset = 0;
          for (const buffer of recordingBuffer) {
            combinedBuffer.set(buffer, offset);
            offset += buffer.length;
          }
          
          const audioCheck = checkAudioLevel(combinedBuffer);
          
          if (!audioCheck.hasSpeech) {
            console.log(`🔇 Chunk ${currentChunkIndex} is silent, skipping upload`);
            chunkIndex--;
            recordingBuffer = [];
            recordingLength = 0;
            return;
          }
          
          const audioBuffer = audioContext.createBuffer(
            1,
            combinedBuffer.length,
            audioContext.sampleRate
          );
          audioBuffer.getChannelData(0).set(combinedBuffer);
          
          const wavBlob = audioBufferToWav(audioBuffer);
          
          console.log(`📦 WAV chunk ${currentChunkIndex}: ${wavBlob.size} bytes`);
          
          const formData = new FormData();
          formData.append('file', wavBlob, `chunk_${currentChunkIndex}.wav`);
          formData.append('meetingId', meetingId);
          formData.append('chunkIndex', currentChunkIndex);

          const response = await fetch('http://localhost:4000/api/upload-chunk', {
            method: 'POST',
            body: formData
          });

          const result = await response.json();
          
          if (result.success) {
            console.log(`✅ WAV chunk ${currentChunkIndex} uploaded: ${result.size} bytes`);
          } else {
            console.error(`❌ Failed to upload chunk ${currentChunkIndex}:`, result.error);
          }
          
          recordingBuffer = [];
          recordingLength = 0;
          
        } catch (err) {
          console.error(`❌ Error processing chunk ${currentChunkIndex}:`, err);
        }
      };
      
      source.connect(highpassFilter);
      highpassFilter.connect(lowpassFilter);
      lowpassFilter.connect(compressor);
      compressor.connect(processor);
      processor.connect(audioContext.destination);
      
      console.log('✅ Recording started');
      console.log('🎙️ Deepgram audio streaming enabled');

      window.meetingAudioContext = audioContext;
      window.meetingProcessor = processor;
      window.meetingSource = source;
      window.processRemainingAudio = processAudioChunk;

    } catch (err) {
      console.error('❌ Recording initialization error:', err);
      alert('Failed to start recording: ' + err.message);
    }
  };

  // Stop recording
  const stopRecording = () => {
    console.log('Stopping recording...');
    
    isRecordingRef.current = false;
    
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (globalSocket && globalSocket.connected) {
      console.log('🛑 Closing Deepgram WebSocket...');
      globalSocket.emit("stop-live-transcription");
    }
    
    console.log('✅ Recording stopped');
  };

  // Live transcription controls
  const startLiveTranscription = () => {
    if (!globalSocket || !globalSocket.connected) {
      console.error('❌ Socket not connected');
      return;
    }

    setIsLiveTranscriptionEnabled(true);
    liveTranscriptionEnabledRef.current = true;
    console.log('🎙️ Live transcription enabled');

    globalSocket.emit('start-live-transcription', {
      meetingId: meeting?.meetingId || meetingId
    });

    globalSocket.emit('toggle-live-transcription', {
      meetingId: meeting?.meetingId || meetingId,
      enabled: true
    });
  };

  const stopLiveTranscription = () => {
    setIsLiveTranscriptionEnabled(false);
    liveTranscriptionEnabledRef.current = false;
    console.log('🛑 Live transcription disabled');

    if (globalSocket && globalSocket.connected) {
      globalSocket.emit('stop-live-transcription');
      globalSocket.emit('toggle-live-transcription', {
        meetingId: meeting?.meetingId || meetingId,
        enabled: false
      });
    }
  };

  const handleLeaveMeeting = () => {
    if (window.confirm('Leave meeting?')) {
      if (globalSocket && globalSocket.connected) {
        globalSocket.emit('leave-meeting');
        globalSocket.disconnect();
      }
      if (globalStream) {
        globalStream.getTracks().forEach((t) => t.stop());
      }
      globalSocket = null;
      globalStream = null;
      hasInitialized.current = false;
      isInitializing = false;
      navigate('/dashboard');
    }
  };

  const handleEndMeeting = async () => {
    if (!window.confirm('End meeting for all participants?')) {
      return;
    }

    try {
      const meetingIdToUse = meeting?.meetingId || meetingId;
      
      console.log('🛑 Ending meeting:', meetingIdToUse);

      if (window.meetingProcessor) {
        console.log('🎤 Processing final audio chunk...');
        
        if (window.processRemainingAudio) {
          await window.processRemainingAudio();
        }
        
        if (window.meetingSource) window.meetingSource.disconnect();
        if (window.meetingProcessor) window.meetingProcessor.disconnect();
        if (window.meetingAudioContext) await window.meetingAudioContext.close();
        
        console.log('✅ Recording stopped');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('🔄 Processing recording...');
      try {
        const processResponse = await fetch('http://localhost:4000/api/process-recording', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetingId: meetingIdToUse })
        });

        const processData = await processResponse.json();
        
        if (processData.success) {
          console.log('✅ Recording processed');
        } else {
          console.warn('⚠️ Processing warning:', processData.error);
        }
      } catch (processErr) {
        console.error('❌ Processing failed:', processErr);
      }

      await fetch(`http://localhost:4000/api/meetings/${meetingIdToUse}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'completed',
          endedAt: new Date()
        })
      });

      if (globalSocket && globalSocket.connected) {
        globalSocket.emit('end-meeting', { meetingId: meetingIdToUse });
      }

      if (globalStream) {
        globalStream.getTracks().forEach((t) => t.stop());
      }
      Object.values(peersRef.current).forEach((peer) => peer.destroy());
      
      globalSocket = null;
      globalStream = null;
      hasInitialized.current = false;
      isInitializing = false;

      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Failed to end meeting:', err);
      alert('Failed to end meeting');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatInput.trim() && globalSocket) {
      const msg = {
        id: Date.now(),
        userName,
        message: chatInput.trim(),
        timestamp: new Date().toISOString()
      };
      setChatMessages((prev) => [...prev, msg]);
      globalSocket.emit('chat-message', { meetingId, message: chatInput.trim(), userName });
      setChatInput('');
    }
  };

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/meeting/${meetingId}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const totalParticipants = peers.length + 1;
  const getGridCols = () => {
    if (totalParticipants === 1) return 'grid-cols-1';
    if (totalParticipants === 2) return 'grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    if (totalParticipants <= 6) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  if (isConnecting) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Connecting to meeting...</p>
          <p className="text-gray-400 text-sm mt-2">Please allow camera and microphone</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      <div className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg">{meeting?.title || 'Meeting Room'}</h1>
            <p className="text-gray-400 text-xs">{totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={copyMeetingLink} className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm">
            {copiedLink ? <><CheckCircle2 className="w-4 h-4 text-green-400" /><span>Copied!</span></> : <><Copy className="w-4 h-4" /><span>Copy Link</span></>}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 overflow-auto relative">
          <LiveSubtitles 
            partialText={partialText}
            isEnabled={isLiveTranscriptionEnabled}
          />
          
          <div className={`grid ${getGridCols()} gap-3 h-full auto-rows-fr`}>
            <VideoTile
              stream={localStream}
              userName={userName}
              isLocal={true}
              isAudioEnabled={isAudioEnabled}
              isVideoEnabled={isVideoEnabled}
            />
            {peers.map((peer) => (
              <VideoTile
                key={peer.socketId}
                stream={peer.stream}
                userName={peer.userName}
                isLocal={false}
                isAudioEnabled={peer.isAudioEnabled}
                isVideoEnabled={peer.isVideoEnabled}
              />
            ))}
          </div>
        </div>

        {showChat && (
          <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
            <div className="flex border-b border-gray-800">
              <button className="flex-1 px-4 py-3 text-sm font-medium text-white bg-gray-800 border-b-2 border-blue-500">
                <MessageSquare className="w-4 h-4 inline mr-2" />Chat
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No messages yet</p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{msg.userName.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-white">{msg.userName}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Send a message..."
                  className="flex-1 bg-gray-800 text-white px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button type="submit" disabled={!chatInput.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white p-2.5 rounded-lg">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {showTranscript && (
          <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold text-gray-100">Live Transcription</h3>
              <button
                onClick={isLiveTranscriptionEnabled ? stopLiveTranscription : startLiveTranscription}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  isLiveTranscriptionEnabled
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isLiveTranscriptionEnabled ? 'Pause' : 'Resume'}
              </button>
            </div>

            {isLiveTranscriptionEnabled && (
              <div className="px-4 py-3 border-b border-gray-800">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  {isTranscribing ? (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span>Transcribing...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Listening</span>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4">
              <div className="live-transcript-content bg-gray-800/50 rounded-lg p-4 max-h-full overflow-y-auto">
                {liveTranscript.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      {isLiveTranscriptionEnabled 
                        ? 'Waiting for speech...' 
                        : 'Enable live transcription to see text in real-time'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {liveTranscript.map((segment, idx) => (
                      <div 
                        key={segment.id} 
                        className="transcript-segment"
                      >
                        <div className="flex items-start gap-3 p-2 rounded hover:bg-gray-700/30 transition-colors">
                          <span className="text-blue-400 text-xs font-medium min-w-[60px] mt-1">
                            {new Date(segment.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                          <p className="text-gray-100 text-base flex-1 leading-relaxed">
                            {segment.text}
                            {idx === liveTranscript.length - 1 && isTranscribing && (
                              <span className="inline-flex ml-2">
                                <span className="animate-pulse text-blue-400">●</span>
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isLiveTranscriptionEnabled && liveTranscript.length > 0 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Auto-scrolling to latest
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleAudio} className={`p-4 rounded-full shadow-lg ${isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
              {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
            <button onClick={toggleVideo} className={`p-4 rounded-full shadow-lg ${isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
            <button
              onClick={handleEndMeeting}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              title="End meeting for everyone"
            >
              <PhoneOff className="w-5 h-5" />
              End Meeting
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowChat(!showChat)} className={`p-3 rounded-lg ${showChat ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
              <MessageSquare className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowTranscript(!showTranscript)} 
              className={`p-3 rounded-lg ${showTranscript ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
              title="Live Transcription"
            >
              <FileText className="w-5 h-5" />
            </button>
            <button onClick={() => setShowParticipants(!showParticipants)} className={`relative p-3 rounded-lg ${showParticipants ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
              <Users className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {totalParticipants}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingRoom;