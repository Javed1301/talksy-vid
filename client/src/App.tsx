import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CallInterface from './components/VideoCall/CallInterface';

// Dummy Data Substitute
const DUMMY_CHATS = [
  { id: 'room-alpha', name: 'Family Group', color: '#25D366' },
  { id: 'room-beta', name: 'College Friends', color: '#34b7f1' },
  { id: 'room-gamma', name: 'Work Project', color: '#ece5dd' },
];

/*
This is HOw ChatList should be integrated.
// 1. Import your real component
import ChatList from './components/Chat/ChatList'; 

function App() {
  return (
    <Router>
      <Routes>
        
        <Route path="/" element={<ChatList />} />
        
        
        <Route path="/call/:roomId" element={<CallInterface />} />
      </Routes>
    </Router>
  );
}
*/

function App() {
  return (
    <Router>
      <Routes>
        {/* --- STEP 1: DUMMY CHAT LIST (Testing Interface) --- */}
        <Route path="/" element={
          <div style={{ backgroundColor: '#111b21', height: '100vh', padding: '20px', color: 'white', fontFamily: 'sans-serif' }}>
            <h1 style={{ color: '#25D366' }}>WhatsApp Clone Test Dashboard</h1>
            <p>Click a chat to simulate entering a room and starting a call:</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              {DUMMY_CHATS.map(chat => (
                <Link 
                  key={chat.id} 
                  to={`/call/${chat.id}`} 
                  style={{ 
                    padding: '20px', 
                    background: '#202c33', 
                    borderRadius: '10px', 
                    textDecoration: 'none', 
                    color: 'white',
                    borderLeft: `5px solid ${chat.color}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>{chat.name}</span>
                  <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>ID: {chat.id} 📹</span>
                </Link>
              ))}
            </div>

            {/* --- FUTURE STEP: Add your real <ChatList /> here --- */}
            {/* <ChatList /> */}
          </div>
        } />

        {/* --- STEP 2: VIDEO CALL ROUTE --- */}
        <Route path="/call/:roomId" element={<CallInterface />} />
      </Routes>
    </Router>
  );
}

export default App;