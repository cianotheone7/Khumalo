// Browser polyfills for Node.js APIs
if (typeof global === 'undefined') {
  (window as any).global = window;
}

if (typeof process === 'undefined') {
  (window as any).process = {
    env: {},
    version: '',
    platform: 'browser',
    nextTick: (callback: () => void) => setTimeout(callback, 0)
  };
}

if (typeof Buffer === 'undefined') {
  // Simple Buffer polyfill for basic operations
  (window as any).Buffer = {
    from: (data: any) => new Uint8Array(data),
    isBuffer: (obj: any) => obj instanceof Uint8Array
  };
}

