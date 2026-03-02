import { useNavigate } from 'react-router-dom';

const ChatHeader = ({ roomId }: { roomId: string }) => {
  const navigate = useNavigate();

  const handleStartCall = () => {
    // This moves the user to http://localhost:5173/call/whatsapp-room-123
    navigate(`/call/${roomId}`);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#202c33' }}>
      <span style={{ color: 'white' }}>Contact Name</span>
      <button 
        onClick={handleStartCall} 
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}
      >
        📹
      </button>
    </div>
  );
};