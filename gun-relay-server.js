#!/usr/bin/env node

/**
 * Simple Gun.js Relay Server
 * Run with: node gun-relay-server.js
 * Or: npm start (if added to package.json scripts)
 */

const Gun = require('gun');
const http = require('http');

const PORT = process.env.PORT || 8765;

// Create HTTP server
const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      service: 'Gun.js Relay',
      timestamp: Date.now() 
    }));
    return;
  }

  // Simple info page
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <html>
      <head><title>Gun.js Relay Server</title></head>
      <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
        <h1>🔫 Gun.js Relay Server</h1>
        <p>This is a Gun.js relay peer for Community Chats.</p>
        <h2>Status: ✅ Running</h2>
        <p><strong>WebSocket URL:</strong> <code>ws://localhost:${PORT}/gun</code></p>
        <p><strong>Production URL:</strong> <code>wss://your-domain.com/gun</code></p>
        <h3>What is this?</h3>
        <p>This relay helps Gun.js sync data across different users in real-time. It's like a mailbox that helps peers find each other, but doesn't store any permanent data.</p>
        <h3>Health Check</h3>
        <p><a href="/health">Check relay health</a></p>
      </body>
    </html>
  `);
});

// Initialize Gun on the server
const gun = Gun({
  web: server,
  axe: false, // Disable network requests to self
});

// Log connections
gun.on('hi', (peer) => {
  console.log('Peer connected:', peer.wire?._id || 'unknown');
});

gun.on('bye', (peer) => {
  console.log('Peer disconnected:', peer.wire?._id || 'unknown');
});

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('🚀 Gun.js Relay Server Started');
  console.log('================================');
  console.log(`Port: ${PORT}`);
  console.log(`WebSocket URL: ws://localhost:${PORT}/gun`);
  console.log('');
  console.log('To use in your app, update decentralized-signaling.ts:');
  console.log('');
  console.log('  Gun({');
  console.log(`    peers: ['http://localhost:${PORT}/gun'],`);
  console.log('    localStorage: true,');
  console.log('  })');
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

