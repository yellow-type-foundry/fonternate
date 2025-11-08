/**
 * Common font weight suffixes and their corresponding CSS font-weight values
 */
export const FONT_WEIGHTS = {
  thin: { suffix: 'thin', weight: 100 },
  hairline: { suffix: 'hairline', weight: 100 },
  extralight: { suffix: 'extralight', weight: 200 },
  'ultra-light': { suffix: 'ultra-light', weight: 200 },
  light: { suffix: 'light', weight: 300 },
  regular: { suffix: 'regular', weight: 400 },
  normal: { suffix: 'normal', weight: 400 },
  medium: { suffix: 'medium', weight: 500 },
  semibold: { suffix: 'semibold', weight: 600 },
  'demi-bold': { suffix: 'demi-bold', weight: 600 },
  bold: { suffix: 'bold', weight: 700 },
  extrabold: { suffix: 'extrabold', weight: 800 },
  'ultra-bold': { suffix: 'ultra-bold', weight: 800 },
  black: { suffix: 'black', weight: 900 },
  heavy: { suffix: 'heavy', weight: 900 },
} as const;

export type FontWeightSuffix = keyof typeof FONT_WEIGHTS;

/**
 * Parses a font name to extract the base name and weight suffix
 * @param fontName - Full font name (e.g., "helvetica-light", "Arial Bold")
 * @returns Object with baseName and weightSuffix, or null if no weight detected
 */
export function parseFontName(fontName: string): {
  baseName: string;
  weightSuffix: string | null;
  weightValue: number | null;
} | null {
  if (!fontName || !fontName.trim()) {
    return null;
  }

  const trimmed = fontName.trim();
  const lower = trimmed.toLowerCase();

  // Check for weight suffixes (case-insensitive)
  // Order matters: check longer suffixes first (e.g., "ultra-light" before "light")
  const sortedWeights = Object.entries(FONT_WEIGHTS).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [key, { suffix, weight }] of sortedWeights) {
    // Check for hyphen-separated suffix (e.g., "helvetica-light")
    if (lower.endsWith(`-${suffix}`)) {
      const baseName = trimmed.slice(0, -(suffix.length + 1)).trim();
      if (baseName) {
        return { baseName, weightSuffix: suffix, weightValue: weight };
      }
    }
    // Check for space-separated suffix (e.g., "Arial Bold")
    if (lower.endsWith(` ${suffix}`)) {
      const baseName = trimmed.slice(0, -(suffix.length + 1)).trim();
      if (baseName) {
        return { baseName, weightSuffix: suffix, weightValue: weight };
      }
    }
  }

  // No weight suffix detected
  return { baseName: trimmed, weightSuffix: null, weightValue: null };
}

/**
 * Builds a font name from base name and weight suffix
 * @param baseName - Base font name (e.g., "helvetica")
 * @param weightSuffix - Weight suffix (e.g., "light", "bold")
 * @returns Full font name (e.g., "helvetica-light")
 */
export function buildFontName(
  baseName: string,
  weightSuffix: string | null
): string {
  if (!weightSuffix) {
    return baseName.trim();
  }
  // Use hyphen separator (more common in font names)
  return `${baseName.trim()}-${weightSuffix}`;
}

/**
 * Gets all available weight suffixes for selection
 */
export function getAvailableWeightSuffixes(): Array<{
  suffix: string;
  label: string;
  weight: number;
}> {
  // Return common weights in order, using numeric weight values as labels
  return [
    { suffix: 'thin', label: '100', weight: 100 },
    { suffix: 'extralight', label: '200', weight: 200 },
    { suffix: 'light', label: '300', weight: 300 },
    { suffix: 'regular', label: '400', weight: 400 },
    { suffix: 'medium', label: '500', weight: 500 },
    { suffix: 'semibold', label: '600', weight: 600 },
    { suffix: 'bold', label: '700', weight: 700 },
    { suffix: 'extrabold', label: '800', weight: 800 },
    { suffix: 'black', label: '900', weight: 900 },
  ];
}

