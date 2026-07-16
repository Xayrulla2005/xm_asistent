import { useEffect, useRef } from 'react';

// Hardware barcode scanners send characters at ~20-50ms intervals, ending with Enter.
// Human typing is typically >150ms per character.
// We use 80ms as the per-character threshold to distinguish scanner from human.

const SCANNER_AVG_MS_PER_CHAR = 80;
const MIN_BARCODE_LEN = 3;
const INACTIVITY_RESET_MS = 500;

export function useBarcodeScanner(
  onScan: (code: string) => void,
  enabled: boolean,
) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    const state = {
      buffer:    '',
      startTime: 0,
      lastTime:  0,
      timer:     null as ReturnType<typeof setTimeout> | null,
    };

    const resetBuffer = () => {
      state.buffer    = '';
      state.startTime = 0;
      state.lastTime  = 0;
    };

    const handler = (e: KeyboardEvent) => {
      const now = Date.now();

      if (e.key === 'Enter') {
        if (state.timer) { clearTimeout(state.timer); state.timer = null; }

        const code    = state.buffer.trim();
        const elapsed = now - state.startTime;
        const avgMs   = code.length > 0 ? elapsed / code.length : 9999;

        resetBuffer();

        if (code.length >= MIN_BARCODE_LEN && avgMs <= SCANNER_AVG_MS_PER_CHAR) {
          onScanRef.current(code);
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      // Only handle printable single characters
      if (e.key.length !== 1) return;

      const gap = state.lastTime > 0 ? now - state.lastTime : 0;

      // Gap too long (human typing speed) — reset buffer and start fresh
      if (state.buffer.length > 0 && gap > SCANNER_AVG_MS_PER_CHAR * 2) {
        resetBuffer();
      }

      if (state.buffer.length === 0) {
        state.startTime = now;
      }

      state.buffer  += e.key;
      state.lastTime = now;

      // Auto-clear if no Enter arrives within INACTIVITY_RESET_MS
      if (state.timer) clearTimeout(state.timer);
      state.timer = setTimeout(() => {
        resetBuffer();
        state.timer = null;
      }, INACTIVITY_RESET_MS);
    };

    document.addEventListener('keydown', handler, true); // capture phase
    return () => {
      document.removeEventListener('keydown', handler, true);
      if (state.timer) clearTimeout(state.timer);
    };
  }, [enabled]);
}
