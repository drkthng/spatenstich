// Test setup for photos tests in jsdom environment.
// Polyfills URL.createObjectURL and fetch-for-blob: which jsdom 20 doesn't implement.
// Runs as setupFilesAfterEnv so jsdom Blob is available.

let blobCounter = 0;
const blobStore = new Map<string, Blob>();

// Mock URL.createObjectURL / revokeObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  configurable: true,
  value: (blob: Blob) => {
    const id = `blob:mock-${++blobCounter}`;
    blobStore.set(id, blob);
    return id;
  },
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  configurable: true,
  value: (url: string) => {
    blobStore.delete(url);
  },
});

// Make the blobStore accessible for tests
(globalThis as any).__blobStore = blobStore;

// Override global fetch to handle blob:mock- URLs by reading from blobStore.
// jsdom 20 has no fetch/Response — we build a minimal fetch-like from scratch.
(globalThis as any).fetch = async (
  input: string | { url?: string; href?: string },
  _init?: unknown,
): Promise<{
  ok: boolean;
  status: number;
  blob(): Promise<Blob>;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
}> => {
  const urlStr =
    typeof input === 'string'
      ? input
      : (input as any).url ?? (input as any).href ?? '';

  if (urlStr.startsWith('blob:mock-')) {
    const blob = blobStore.get(urlStr);
    if (!blob) {
      return {
        ok: false,
        status: 404,
        blob: () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        text: () => Promise.resolve(''),
      };
    }
    return {
      ok: true,
      status: 200,
      blob: () => Promise.resolve(blob),
      arrayBuffer: async () => {
        const arrBuf = await blob.arrayBuffer();
        return arrBuf;
      },
      text: async () => {
        // Read blob as text via FileReader
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(blob);
        });
      },
    };
  }

  // For data: URLs — decode directly (used in tests that fetch a data: URL)
  if (urlStr.startsWith('data:')) {
    const [header, base64] = urlStr.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(base64 ?? '');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    return {
      ok: true,
      status: 200,
      blob: () => Promise.resolve(blob),
      arrayBuffer: () => Promise.resolve(bytes.buffer as ArrayBuffer),
      text: () => Promise.resolve(binary),
    };
  }

  return Promise.reject(new Error(`fetch not available for: ${urlStr}`));
};
