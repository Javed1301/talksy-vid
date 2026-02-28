
import type { RtpCodecCapability, WorkerSettings } from 'mediasoup/types';


export const config = {
  // Worker settings
  worker: {
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
    logLevel: 'warn',
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp',
    ],
  } as WorkerSettings,

  // Router settings (Media capabilities)
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video',
        mimeType: 'video/VP8', // Good compatibility for WhatsApp clone
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000,
        },
      },
    ] as RtpCodecCapability[],
  },

  // WebRtcTransport settings
  webRtcTransport: {
    listenIps: [
      {
        ip: '127.0.0.1',
        announcedIp: undefined, // Change to public IP for production
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  },
};