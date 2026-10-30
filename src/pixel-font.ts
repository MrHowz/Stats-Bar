// Original 5 × 7 bitmap numerals, shared by preview SVG and hosted map glyphs.
export const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "11011", "11011", "11011", "11011", "11011", "01110"],
  "1": ["00110", "01110", "00110", "00110", "00110", "00110", "11111"],
  "2": ["01110", "11011", "00011", "00110", "01100", "11000", "11111"],
  "3": ["11110", "00011", "00011", "01110", "00011", "00011", "11110"],
  "4": ["00011", "00111", "01111", "11011", "11111", "00011", "00011"],
  "5": ["11111", "11000", "11000", "11110", "00011", "00011", "11110"],
  "6": ["01110", "11000", "11000", "11110", "11011", "11011", "01110"],
  "7": ["11111", "00011", "00110", "00110", "01100", "01100", "01100"],
  "8": ["01110", "11011", "11011", "01110", "11011", "11011", "01110"],
  "9": ["01110", "11011", "11011", "01111", "00011", "00011", "01110"],
  "/": ["00001", "00011", "00010", "00100", "01000", "11000", "10000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00110", "00110"],
};
export function glyphSvgBody(char: string): string {
  const rows = GLYPHS[char] ?? [];
  const d = rows
    .flatMap((row, y) =>
      [...row].map((bit, x) =>
        bit === "1" ? `M${x + 1} ${y + 1}h1v1h-1z` : "",
      ),
    )
    .join("");
  return `<path d="${d}" fill="none" stroke="#10171a" stroke-width="0.7" stroke-linejoin="miter"/><path d="${d}" fill="#fff8ec"/>`;
}
export function pixelText(
  text: string,
  cx: number,
  cy: number,
  maxWidth: number,
  height = 10,
): string {
  const scale = Math.min(height / 9, maxWidth / (text.length * 7));
  return [...text]
    .map(
      (c, i) =>
        `<g transform="translate(${cx - (text.length * 7 * scale) / 2 + i * 7 * scale} ${cy - (9 * scale) / 2}) scale(${scale})">${glyphSvgBody(c)}</g>`,
    )
    .join("");
}
export const glyphFile = (char: string) =>
  char === "/" ? "slash" : char === "-" ? "minus" : char === "." ? "dot" : char;
