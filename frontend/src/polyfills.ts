// Polyfills for Node.js modules in browser
import { Buffer } from 'buffer';

// Make Buffer available globally for XMTP and other libraries
window.Buffer = Buffer;
(globalThis as any).Buffer = Buffer;

// Process polyfill
(window as any).process = {
  env: {},
  version: '',
  nextTick: (fn: Function) => setTimeout(fn, 0),
};

export {};

