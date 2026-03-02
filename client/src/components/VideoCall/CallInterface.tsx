import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useWebRTC } from '../../hooks/useWebRTC';
import { socket } from '../../services/mediasoup';
import { useParams } from 'react-router-dom';
import VideoElement from './VideoElement';

const CallInterface: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<string[]>([]);
  const [isJoining, setIsJoining] = useState(false); // New: Loading state
  const hasJoined = useRef(false); // New: To prevent multiple auto-join attempts

  const { 
    remoteStreams, 
    startVideoCall, 
    initConsumer, 
    toggleAudio, 
    toggleVideo, 
    isAudioMuted, 
    isVideoOff,
    leaveCall 
  } = useWebRTC();

  // --- AUTO-JOIN LOGIC ---
  useEffect(() => {
    

    const autoJoin = async () => {
      if (roomId && !isJoining && !hasJoined.current) {
        setIsJoining(true);
        try {
          await startVideoCall(roomId, localVideoRef);
          hasJoined.current = true;
        } catch (err) {
          console.error("Auto-join failed:", err);
        } finally {
          setIsJoining(false);
        }
      }
    };
    autoJoin();

    return () => {
      hasJoined.current = false;

    }; // Cleanup if needed
  }, [roomId]); // Runs once on mount

  useEffect(() => {
    socket.on('new-producer', ({ producerId }: { producerId: string }) => {
      initConsumer(producerId);
    });

    socket.on('hand-raised', ({ userId }: { userId: string }) => {
      setRaisedHands((prev) => [...prev, userId]);
      setTimeout(() => setRaisedHands((prev) => prev.filter(id => id !== userId)), 5000);
    });

    return () => {
      socket.off('new-producer');
      socket.off('hand-raised');
    };
  }, [initConsumer]);

  const handleRaiseHand = () => {
    setIsHandRaised(!isHandRaised);
    socket.emit('raise-hand', { roomId: roomId || 'whatsapp-room' });
  };

  const styles: Record<string, React.CSSProperties> = useMemo(() => ({
    container: { height: '100vh', backgroundColor: '#111b21', display: 'flex', flexDirection: 'column' as const },
    grid: { 
      flex: 1, 
      display: 'grid', 
      // Dynamically calculate columns: 1 person = 1 col, 2-4 people = 2 cols
      gridTemplateColumns: remoteStreams.length === 0 ? '1fr' : 
                          remoteStreams.length <= 3 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
      // Use minmax to ensure boxes maintain a readable size
      gridTemplateRows: 'minmax(200px, 1fr)', 
      gap: '15px', 
      padding: '20px',
      alignContent: 'center', // Centers the grid if there's extra space
      overflowY: 'auto' as const // Allows scrolling if there are many users
    },
    videoCard: { position: 'relative', borderRadius: '15px', overflow: 'hidden', background: '#202c33', aspectRatio: '16/9' },
    video: { width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' },
    avatarPlaceholder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#202c33', color: '#8696a0', fontSize: '1.2rem' },
    nameTag: { position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 12px', borderRadius: '5px', fontSize: '14px', zIndex: 10 },
    footer: { padding: '20px', display: 'flex', justifyContent: 'center', gap: '15px', background: '#202c33' },
    iconBtn: { backgroundColor: '#3b4a54', color: 'white', padding: '12px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
    activeBtn: { backgroundColor: '#25D366', color: 'white', padding: '12px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
    disabledBtn: { backgroundColor: '#3b4a54', color: '#8696a0', padding: '12px 20px', borderRadius: '8px', border: 'none', cursor: 'not-allowed' }
  }), []);

  return (
    <div style={styles.container}>
      <div style={styles.grid}>
        <div style={styles.videoCard}>
          <video 
            ref={localVideoRef} 
            autoPlay 
            muted 
            playsInline 
            style={{ ...styles.video, opacity: isVideoOff ? 0 : 1 }} 
          />
          {isVideoOff && <div style={styles.avatarPlaceholder}>Camera Off</div>}
          <div style={styles.nameTag}>
            You {isAudioMuted && '🔇'} {isHandRaised && '✋'}
          </div>
        </div>

        {remoteStreams.map((item) => (
          <div key={item.id} style={styles.videoCard}>
            <VideoElement stream={item.stream} />
            <div style={styles.nameTag}>
              WhatsApp User {raisedHands.includes(item.id) && '✋'}
            </div>
          </div>
        ))}
      </div>

      <div style={styles.footer}>
        <button 
          onClick={toggleAudio} 
          disabled={isJoining}
          style={isJoining ? styles.disabledBtn : (isAudioMuted ? styles.activeBtn : styles.iconBtn)}
        >
          {isAudioMuted ? 'Unmute' : 'Mute'}
        </button>
        
        {/* NEW: THE HANG UP BUTTON */}
        <button 
          onClick={leaveCall} 
          style={{ ...styles.iconBtn, backgroundColor: '#ea0038', borderRadius: '50%', width: '60px', height: '60px' }}
        >
          📞
        </button>

        <button 
          onClick={toggleVideo} 
          disabled={isJoining}
          style={isJoining ? styles.disabledBtn : (isVideoOff ? styles.activeBtn : styles.iconBtn)}
        >
          {isVideoOff ? 'Video On' : 'Video Off'}
        </button>

        <button 
          onClick={handleRaiseHand} 
          disabled={isJoining}
          style={isJoining ? styles.disabledBtn : (isHandRaised ? styles.activeBtn : styles.iconBtn)}
        >
          ✋ {isJoining ? 'Initializing...' : 'Raise Hand'}
        </button>
      </div>
    </div>
  );
};

export default CallInterface;