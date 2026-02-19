// Advanced device fingerprinting for anti-cheat system

async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';
    canvas.width = 200;
    canvas.height = 50;
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Reforge fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Reforge fingerprint', 4, 17);
    return canvas.toDataURL();
  } catch {
    return 'canvas-error';
  }
}

function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';
    const glContext = gl as WebGLRenderingContext;
    const debugInfo = glContext.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'no-debug-info';
    const vendor = glContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = glContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    return `${vendor}~${renderer}`;
  } catch {
    return 'webgl-error';
  }
}

function getAudioFingerprint(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const AudioContext = window.AudioContext || (window as unknown as Record<string, unknown>).webkitAudioContext as typeof window.AudioContext;
      if (!AudioContext) { resolve('no-audio'); return; }
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gain = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      gain.gain.value = 0;
      oscillator.type = 'triangle';
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gain);
      gain.connect(context.destination);
      oscillator.start(0);

      const dataArray = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += Math.abs(dataArray[i]);
      }
      oscillator.stop();
      context.close();
      resolve(sum.toString());
    } catch {
      resolve('audio-error');
    }
  });
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateFingerprint(): Promise<string> {
  const components: string[] = [];

  // Screen
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  components.push(`${screen.availWidth}x${screen.availHeight}`);
  components.push(`dpr:${window.devicePixelRatio}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  components.push(new Date().getTimezoneOffset().toString());

  // Language
  components.push(navigator.language);
  components.push((navigator.languages || []).join(','));

  // Platform
  components.push(navigator.platform || 'unknown');
  components.push(navigator.userAgent);
  components.push(navigator.hardwareConcurrency?.toString() || 'unknown');
  components.push((navigator as unknown as Record<string, unknown>).deviceMemory?.toString() || 'unknown');

  // Plugins
  const plugins = Array.from(navigator.plugins || []).map(p => p.name).join(',');
  components.push(plugins || 'no-plugins');

  // Touch support
  components.push(`touch:${navigator.maxTouchPoints}`);

  // Canvas
  const canvasFP = await getCanvasFingerprint();
  components.push(canvasFP);

  // WebGL
  components.push(getWebGLFingerprint());

  // Audio
  const audioFP = await getAudioFingerprint();
  components.push(audioFP);

  // Storage test
  components.push(`ls:${!!window.localStorage}`);
  components.push(`ss:${!!window.sessionStorage}`);
  components.push(`idb:${!!window.indexedDB}`);

  // Do Not Track
  components.push(`dnt:${navigator.doNotTrack}`);

  // Cookie enabled
  components.push(`cookie:${navigator.cookieEnabled}`);

  const raw = components.join('|||');
  return hashString(raw);
}

export function getStoredFingerprints(): string[] {
  try {
    const stored = localStorage.getItem('rf_device_fps');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function storeFingerprint(fp: string): void {
  try {
    const existing = getStoredFingerprints();
    if (!existing.includes(fp)) {
      existing.push(fp);
    }
    localStorage.setItem('rf_device_fps', JSON.stringify(existing));
  } catch {
    // silently fail
  }
}

export function getStoredUserIds(): string[] {
  try {
    const stored = localStorage.getItem('rf_user_ids');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function storeUserId(uid: string): void {
  try {
    const existing = getStoredUserIds();
    if (!existing.includes(uid)) {
      existing.push(uid);
    }
    localStorage.setItem('rf_user_ids', JSON.stringify(existing));
  } catch {
    // silently fail
  }
}

export function getTestAttemptKey(testId: string): string {
  return `rf_test_${testId}`;
}

export function hasCompletedTest(testId: string): boolean {
  try {
    return localStorage.getItem(getTestAttemptKey(testId)) === 'completed';
  } catch {
    return false;
  }
}

export function markTestCompleted(testId: string): void {
  try {
    localStorage.setItem(getTestAttemptKey(testId), 'completed');
  } catch {
    // silently fail
  }
}

// ============ WEIGHTED ANTI-CHEAT HELPERS ============

export interface DeviceSignals {
  screenRes: string;
  timezone: string;
  timezoneOffset: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  language: string;
  platform: string;
}

export function getDeviceSignals(): DeviceSignals {
  return {
    screenRes: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as unknown as Record<string, unknown>).deviceMemory as number || 0,
    language: navigator.language,
    platform: navigator.platform || 'unknown',
  };
}

export function getCreationTimestamps(): number[] {
  try {
    const stored = localStorage.getItem('rf_creation_ts');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function storeCreationTimestamp(): void {
  try {
    const existing = getCreationTimestamps();
    existing.push(Date.now());
    localStorage.setItem('rf_creation_ts', JSON.stringify(existing));
  } catch {
    // silently fail
  }
}
