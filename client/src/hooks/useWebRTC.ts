import { useCallback, useState } from 'react';
import { device, socket } from '../services/mediasoup.js';
import { useNavigate } from 'react-router-dom';

export const useWebRTC = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ id: string; stream: MediaStream }[]>([]);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const navigate = useNavigate();

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

const startVideoCall = async (
  roomId: string,
  localVideoRef: React.RefObject<HTMLVideoElement | null>
) => {
  socket.emit('joinRoom', { roomId }, async (data: any) => {
    
    if (!data || !data.rtpCapabilities) {
      console.error("❌ FAILED: No rtpCapabilities received from server.");
      return;
    }

    try {
      // 1. Load Mediasoup Device
      if (!device.loaded) {
        await device.load({ routerRtpCapabilities: data.rtpCapabilities });
        console.log("✅ Device loaded with server RTP capabilities.");
      }

      // 2. Consume existing producers immediately
      if (data.existingProducerIds && data.existingProducerIds.length > 0) {
        console.log(`🔍 Found ${data.existingProducerIds.length} existing producers.`);
        data.existingProducerIds.forEach((pId: string) => {
          initConsumer(pId);
        });
      }

      // 3. Get Local Media with Hardware Fallback
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err: any) {
        if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          console.warn("⚠️ Camera in use, falling back to audio-only.");
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw err;
        }
      }

      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // 4. Create SENDER Transport (Producing)
      socket.emit('createWebRtcTransport', { sender: true }, async ({ params }: any) => {
        const sendTransport = device.createSendTransport(params);

        sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          try {
            socket.emit(`transport-connect-${sendTransport.id}`, { dtlsParameters });
            callback();
          } catch (error: any) {
            errback(error);
          }
        });

        sendTransport.on('produce', async (parameters, callback, errback) => {
          try {
            socket.emit(`transport-produce-${sendTransport.id}`, parameters, ({ id }: any) => {
              callback({ id });
            });
          } catch (error: any) {
            errback(error);
          }
        });

        // Produce available tracks
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        
        if (videoTrack) await sendTransport.produce({ track: videoTrack });
        if (audioTrack) await sendTransport.produce({ track: audioTrack });
        
        console.log("🚀 Producing local media to server");
      });

    } catch (error: any) {
      console.error("Error in startVideoCall:", error);
    }
  });
};

const initConsumer = useCallback(async (producerId: string) => {
  // Prevent duplicate consumers for the same producerId
  setRemoteStreams((prev) => {
    const isAlreadyConsumed = prev.find((s) => s.id === producerId);
    if (isAlreadyConsumed) {
      console.log(`⏭️ Producer ${producerId} already being consumed, skipping.`);
      return prev;
    }

    socket.emit('createWebRtcTransport', { sender: false }, async ({ params }: any) => {
      const recvTransport = device.createRecvTransport(params);

      recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          socket.emit(`transport-connect-${recvTransport.id}`, { dtlsParameters });
          callback();
        } catch (error: any) {
          errback(error);
        }
      });

      socket.emit('createConsumer', { 
        producerId, 
        rtpCapabilities: device.rtpCapabilities 
      }, async ({ params }: any) => {
        if (!params) return;

        const consumer = await recvTransport.consume(params);
        const { track } = consumer;
        const newStream = new MediaStream([track]);
        
        // Add to state only if not present (final check)
        setRemoteStreams((currentStreams) => {
          if (currentStreams.find(s => s.id === producerId)) return currentStreams;
          return [...currentStreams, { id: producerId, stream: newStream }];
        });

        socket.emit('resumeConsumer', { consumerId: consumer.id });
      });
    });

    return prev; // Return existing state while async emit works
  });
}, [device, socket]);

  const leaveCall = useCallback(() => {
    // 1. Stop the camera and mic hardware immediately
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop(); // This turns off the green camera light
      });
    }

    // 2. Tell the server to kill the transports
    socket.emit('leave-call');

    // 3. Reset local states
    setLocalStream(null);
    setRemoteStreams([]);

    // 4. Go back to chat list
    navigate('/'); 
  }, [localStream, navigate]);

  return { 
    startVideoCall, 
    initConsumer, 
    remoteStreams, 
    toggleAudio, 
    toggleVideo, 
    isAudioMuted, 
    isVideoOff, 
    leaveCall 
  };
};