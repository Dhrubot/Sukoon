function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clampAlpha(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function parseHexColor(input: string): { r: number; g: number; b: number; a?: number } | null {
  const normalized = input.trim().replace('#', '');

  if (normalized.length === 3 || normalized.length === 4) {
    const [r, g, b, a] = normalized.split('');
    return {
      r: parseInt(`${r}${r}`, 16),
      g: parseInt(`${g}${g}`, 16),
      b: parseInt(`${b}${b}`, 16),
      a: a ? parseInt(`${a}${a}`, 16) / 255 : undefined,
    };
  }

  if (normalized.length === 6 || normalized.length === 8) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
      a: normalized.length === 8 ? parseInt(normalized.slice(6, 8), 16) / 255 : undefined,
    };
  }

  return null;
}

function parseRgbColor(input: string): { r: number; g: number; b: number; a?: number } | null {
  const match = input
    .trim()
    .match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i);

  if (!match) return null;

  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] !== undefined ? Number(match[4]) : undefined,
  };
}

export function withAlpha(color: string, alpha: number): string {
  const normalizedAlpha = clampAlpha(alpha);
  const parsed = color.startsWith('#') ? parseHexColor(color) : parseRgbColor(color);

  if (!parsed) {
    return color;
  }

  const composedAlpha = parsed.a !== undefined
    ? clampAlpha(parsed.a * normalizedAlpha)
    : normalizedAlpha;

  return `rgba(${clampChannel(parsed.r)}, ${clampChannel(parsed.g)}, ${clampChannel(parsed.b)}, ${composedAlpha})`;
}

