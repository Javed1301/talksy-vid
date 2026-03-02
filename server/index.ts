import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as mediasoup from 'mediasoup';
import { config } from './config/mediasoupConfig.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer,
   { 
    cors: { 
      origin: "http://localhost:5173", 
      methods: ["GET", "POST"],
      credentials: true
    }
   });

let worker: mediasoup.types.Worker;
// Room ID -> { router, peers: [] }
const rooms = new Map<string, { router: mediasoup.types.Router; peers: string[] }>();
// socket.id -> { transports: [], producers: [], consumers: [] }
const peerState = new Map<string, { transports: any[]; producers: any[]; consumers: any[] }>();

const startMediasoup = async () => {
  worker = await mediasoup.createWorker(config.worker);
};
startMediasoup();

io.on('connection', (socket) => {
  console.log('User Connected:', socket.id);
  peerState.set(socket.id, { transports: [], producers: [], consumers: [] });

  // --- PHASE 1: INITIALIZATION ---
  socket.on('joinRoom', async ({ roomId }, callback) => {
    try {
      let router: mediasoup.types.Router;

      // 1. Handle Room/Router Creation first
      if (rooms.has(roomId)) {
        // Room exists, get the router and add the peer
        router = rooms.get(roomId)!.router;
        
        // Safety check: Don't add the same peer twice if they refresh
        if (!rooms.get(roomId)!.peers.includes(socket.id)) {
          rooms.get(roomId)!.peers.push(socket.id);
        }
      } else {
        // New room: Create a new router
        router = await worker.createRouter(config.router);
        rooms.set(roomId, { router, peers: [socket.id] });
        console.log(`🏠 New room created: ${roomId}`);
      }

      // 2. Now that the room is confirmed, gather existing producers
      const existingProducerIds: string[] = [];
      
      // Loop through all peers currently in this specific room
      rooms.get(roomId)?.peers.forEach(peerId => {
        // We only want producers from OTHER people, not ourselves
        if (peerId !== socket.id) {
          const producers = peerState.get(peerId)?.producers || [];
          producers.forEach(p => {
            existingProducerIds.push(p.id);
          });
        }
      });

      console.log(`👤 User ${socket.id} joined ${roomId}. Found ${existingProducerIds.length} existing producers.`);

      // 3. Send everything back to the client
      callback({
        rtpCapabilities: router.rtpCapabilities,
        existingProducerIds: existingProducerIds
      });

    } catch (error) {
      console.error("❌ joinRoom error:", error);
      callback({ error: "Failed to join room" });
    }
  });

  // --- PHASE 2: TRANSPORT CREATION ---
  // --- PHASE 2: TRANSPORT CREATION ---
  socket.on('createWebRtcTransport', async ({ sender }, callback) => {
    const roomId = Array.from(rooms.keys()).find(id => rooms.get(id)?.peers.includes(socket.id));
    const router = rooms.get(roomId!)?.router;

    if (!router) return callback({ error: 'Router not found' });

    // Create the transport using your config
    const transport = await router.createWebRtcTransport(config.webRtcTransport);
    
    // 1. Store the transport in the peer's state
    peerState.get(socket.id)?.transports.push(transport);

    // 2. CRITICAL FIX: Use a UNIQUE event name for this specific transport
    // This prevents the "connect() already called" crash
    socket.once(`transport-connect-${transport.id}`, async ({ dtlsParameters }) => {
      try {
        await transport.connect({ dtlsParameters });
        console.log(`✅ Transport ${transport.id} connected successfully`);
      } catch (error) {
        console.error('Transport connect error:', error);
      }
    });

    // 3. Handle Production (Sending Media)
    if (sender) {
      socket.once(`transport-produce-${transport.id}`, async ({ kind, rtpParameters }, callback) => {
        try {
          const producer = await transport.produce({ kind, rtpParameters });
          peerState.get(socket.id)?.producers.push(producer);
          
          // Notify others in the WhatsApp Room
          socket.to(roomId!).emit('new-producer', { producerId: producer.id });
          
          callback({ id: producer.id });
          console.log(`🚀 Producer created: ${producer.id} (${kind})`);
        } catch (error) {
          console.error('Produce error:', error);
        }
      });
    }

    // 4. Send the parameters back to the client
    callback({
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      }
    });
  });

  // --- PHASE 3: CONSUMING (RECEIVING) ---

  // 1. Handling the Request to Consume
  socket.on('createConsumer', async ({ producerId, rtpCapabilities }, callback) => {
    const roomId = Array.from(rooms.keys()).find(id => rooms.get(id)?.peers.includes(socket.id));
    const router = rooms.get(roomId!)?.router;

    // Check if the SFU can consume this producer with the client's capabilities
    if (router!.canConsume({ producerId, rtpCapabilities })) {
      
      // Create the Consumer on the Receiver's Transport
      const transport = peerState.get(socket.id)?.transports.find(t => !t.appData.sender); 
      const consumer = await transport.consume({
        producerId,
        rtpCapabilities,
        paused: true, // Best practice: start paused
      });

      peerState.get(socket.id)?.consumers.push(consumer);

      // 2. Handling the "Resume": Mediasoup consumers start paused for sync
      consumer.on('transportclose', () => consumer.close());

      callback({
        params: {
          id: consumer.id,
          producerId: consumer.producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        }
      });
    }
  });

  // 3. Handling the actual Play command
  socket.on('resumeConsumer', async ({ consumerId }) => {
    const consumer = peerState.get(socket.id)?.consumers.find(c => c.id === consumerId);
    await consumer?.resume();
  });

  socket.on('raise-hand', ({ roomId }) => {
  // Relay the hand raise to everyone else in the room
    socket.to(roomId).emit('hand-raised', { userId: socket.id });
  });

  const cleanupPeer = (socketId: string) => {
    const peer = peerState.get(socketId);
    if (peer) {
      console.log(`Cleaning up Mediasoup resources for ${socketId}`);

      // 1. Close all Transports (This automatically closes all Producers/Consumers)
      peer.transports.forEach((transport) => {
        transport.close(); 
      });

      // 2. Remove from global state
      peerState.delete(socketId);
    }

    // 3. Remove from rooms
    rooms.forEach((room, roomId) => {
      room.peers = room.peers.filter((id) => id !== socketId);
      if (room.peers.length === 0) {
        // Optional: Close the router if the room is empty to save CPU
        // room.router.close(); 
        rooms.delete(roomId);
      }
    });
  };

  // Handle explicit "Leave Call" button
  socket.on('leave-call', () => {
    cleanupPeer(socket.id);
  });

  // Handle tab closing / crash
  socket.on('disconnect', () => {
    console.log(`User ${socket.id} disconnected (Tab closed)`);
    cleanupPeer(socket.id);
  });
});

httpServer.listen(3000);