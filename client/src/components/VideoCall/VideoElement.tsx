import React, { useRef, useEffect, useState } from 'react';

const VideoElement = ({ stream }: { stream: MediaStream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 1. Attach the MediaStream to the video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // 2. Audio Analysis & Visual Activity Indicator
  useEffect(() => {
    // CRITICAL: Only proceed if the stream actually has audio tracks
    // This prevents the "MediaStream has no audio track" crash
    if (stream && stream.getAudioTracks().length > 0) {
      let audioContext: AudioContext;
      let analyzer: AnalyserNode;
      let animationFrameId: number;

      try {
        // Cross-browser AudioContext initialization
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256; // Smaller FFT size for simple volume detection
        source.connect(analyzer);

        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          analyzer.getByteFrequencyData(dataArray);
          
          // Calculate the average volume across frequency bins
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const average = sum / bufferLength;

          // Set threshold (e.g., 30) to determine if the user is currently speaking
          setIsSpeaking(average > 30);
          
          animationFrameId = requestAnimationFrame(checkVolume);
        };

        checkVolume();
      } catch (err) {
        console.warn("AudioContext initialization failed:", err);
      }

      // Cleanup: Stop analysis and close context when component unmounts
      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (audioContext) audioContext.close();
      };
    }
  }, [stream]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' }}>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
      />

      {/* Speaking Indicator: A subtle green border or glow when audio is detected */}
      {isSpeaking && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          border: '4px solid #25D366',
          boxShadow: 'inset 0 0 15px rgba(37, 211, 102, 0.5)',
          pointerEvents: 'none',
          zIndex: 10,
          borderRadius: '15px'
        }} />
      )}
      
      {/* Small mic icon status for remote users */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        right: '10px',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: '4px',
        borderRadius: '50%',
        zIndex: 20
      }}>
        {stream.getAudioTracks().length > 0 ? '🎤' : '🔇'}
      </div>
    </div>
  );
};

export default VideoElement;