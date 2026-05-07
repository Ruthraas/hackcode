declare module '*.css';

interface Window {
  __hackcodePageToken?: string;
  __hackcodeInitTokens?: Record<string, string>;
  __hackcodeMatrixTimer?: ReturnType<typeof setInterval>;
  __hackcodeResizeHandlers?: Array<() => void>;
}
