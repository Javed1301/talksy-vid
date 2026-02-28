

## 🛠 Project Structure: WhatsApp Clone (with Video)

Here is the recommended layout. I have structured this so you can easily merge it into your existing WhatsApp clone later.

### 1. **Server Folder** (`/server`)

Since SFU logic is heavy, we separate the **Mediasoup** logic from the **Express** routes.

```text
server/
├── node_modules/
├── config/
│   └── mediasoupConfig.js  # SFU settings (IPs, Ports, Codecs)
├── lib/
│   └── mediasoupWorker.js  # Logic to create Workers & Routers
├── socket/
│   └── signaling.js        # Socket.io event handlers for calls
├── .env                    # Port and IP variables
├── index.js                # Main entry point (Express + Socket.io)
└── package.json

```

### 2. **Client Folder** (`/client`)

We’ll create a dedicated `hooks` and `services` folder to handle the complex WebRTC state.

```text
client/
├── public/
├── src/
│   ├── components/
│   │   ├── Chat/           # Existing WhatsApp Chat components
│   │   └── VideoCall/      # NEW: Video UI (Camera grid, End call)
│   ├── hooks/
│   │   └── useWebRTC.js    # Custom hook to manage Mediasoup logic
│   ├── services/
│   │   └── socket.js       # Socket.io client initialization
│   │   └── mediasoup.js    # Mediasoup-client transport logic
│   ├── App.jsx             # Main routing
│   ├── main.jsx
│   └── index.css           # WhatsApp theme colors (Green/Teal)
├── .env
├── package.json
└── vite.config.js

```
Mediasoup Design Link - https://whimsical.com/mediasoup-design-RHnTu23J5mABBD2UYyCxBr