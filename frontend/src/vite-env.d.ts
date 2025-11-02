/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ARBITRUM_CHAIN_ID?: string
  readonly VITE_ARBITRUM_TESTNET_CHAIN_ID?: string
  readonly VITE_COMMUNITY_ACCESS_CONTRACT?: string
  readonly VITE_MEETING_SCHEDULER_CONTRACT?: string
  readonly VITE_DEFAULT_WHIP_URL?: string
  readonly VITE_DEFAULT_RTMP_URL?: string
  readonly VITE_ENABLE_TESTNET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Gun.js type declarations
declare module 'gun' {
  interface IGunConstructorOptions {
    peers?: string[];
    localStorage?: boolean;
    radisk?: boolean;
    [key: string]: any;
  }

  interface IGunInstance<T = any> {
    get(key: string): IGunInstance;
    put(data: any, callback?: (ack: any) => void): IGunInstance;
    on(callback: (data: T, key: string) => void): IGunInstance;
    map(): IGunInstance;
    [key: string]: any;
  }

  function Gun(options?: IGunConstructorOptions): IGunInstance;
  
  export default Gun;
}

declare module 'gun/sea' {}
