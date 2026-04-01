import { useCallback, useEffect, useState } from 'react';

export interface UseLocalFontPreviewResult {
  fontFamily: string | null;
  ready: boolean;
  error: string | null;
  /**
   * Load a font from a `File` (file input) or a URL string (`fetch` + FontFace),
   * e.g. `chrome.runtime.getURL('assets/MyFont.woff2')`.
   */
  loadFromFile: (source: File | string) => Promise<void>;
  /** Clear loaded preview state (does not remove @font-face from document.fonts). */
  reset: () => void;
}

function sanitizeFontName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/["'\\]/g, '').trim() || 'LocalFont';
}

function familyNameFromUrl(url: string): string {
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.href : undefined);
    const last = u.pathname.split('/').filter(Boolean).pop();
    if (last) return sanitizeFontName(last);
  } catch {
    /* ignore */
  }
  const tail = url.split(/[/\\]/).filter(Boolean).pop();
  return tail ? sanitizeFontName(tail) : 'LocalFont';
}

/**
 * Loads a user-selected font file into the page via the FontFace API for local preview.
 *
 * - `useLocalFontPreview()` — imperative: call `loadFromFile` when the user picks a file.
 * - `useLocalFontPreview(file)` — reactive: reloads when `file` changes; pass `null` to reset.
 */
export function useLocalFontPreview(sourceFile?: File | null): UseLocalFontPreviewResult {
  const [fontFamily, setFontFamily] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFontFamily(null);
    setReady(false);
    setError(null);
  }, []);

  const loadFromFile = useCallback(async (source: File | string) => {
    setError(null);
    setReady(false);
    try {
      let name: string;
      let face: FontFace;

      if (typeof source === 'string') {
        name = familyNameFromUrl(source);
        const res = await fetch(source);
        if (!res.ok) {
          throw new Error(`Failed to fetch font: ${res.status} ${res.statusText}`);
        }
        const buf = await res.arrayBuffer();
        face = new FontFace(name, buf);
      } else {
        name = sanitizeFontName(source.name);
        const buf = await source.arrayBuffer();
        face = new FontFace(name, buf);
      }

      await face.load();
      document.fonts.add(face);
      setFontFamily(name);
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load font');
      setFontFamily(null);
      setReady(false);
    }
  }, []);

  useEffect(() => {
    if (sourceFile === undefined) {
      return;
    }
    if (sourceFile === null) {
      reset();
      return;
    }
    void loadFromFile(sourceFile);
  }, [sourceFile, loadFromFile, reset]);

  return { fontFamily, ready, error, loadFromFile, reset };
}
