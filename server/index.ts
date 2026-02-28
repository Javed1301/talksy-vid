import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import * as mediasoup from 'mediasoup';
import { config } from './config/mediasoupConfig.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:5173" }
});

let worker: mediasoup.types.Worker;
let router: mediasoup.types.Router;

const startMediasoup = async () => {
  worker = await mediasoup.createWorker(config.worker);
  // Creating a single Router (Room) for testing
  router = await worker.createRouter(config.router);
  console.log('✅ SFU Router created');
};

startMediasoup();

io.on('connection', (socket) => {
  // 1. Send Router capabilities to the client so they know how to encode video
  socket.on('getRtpCapabilities', (callback) => {
    callback(router.rtpCapabilities);
  });

  // 2. We will add Transport creation logic here next...
});

httpServer.listen(3000, () => console.log('🚀 Server at http://localhost:3000'));