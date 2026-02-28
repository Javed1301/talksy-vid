import { Device } from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';

// Use the WhatsApp theme: Green logs for success!
const log = (msg: string) => console.log(`%c[SFU]: ${msg}`, 'color: #25D366; font-weight: bold;');

export const socket: Socket = io('http://localhost:3000');

export let device: Device;

export const loadDevice = async (routerRtpCapabilities: any) => {
  try {
    device = new Device();

    // Check if the browser supports the codecs the server provided
    await device.load({ routerRtpCapabilities });
    
    log('Device loaded successfully!');
  } catch (error) {
    console.error('Failed to load device:', error);
  }
};