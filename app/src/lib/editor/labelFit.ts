// Phase 30: how an element's name is shown on the plate (30-CONTEXT D-12, DESIGN3-03).
// Names keep a constant on-screen size. A name on a long narrow element runs along the
// element; a name that still does not fit is shortened with an ellipsis; on very small
// elements it is hidden. The selected element always shows its full name.
//
// Pure: the caller passes a function that measures text. The renderer measures with the real
// font; without one, width is estimated from the character count (used in tests).

/** Average glyph width of Fraunces 500 as a share of the font size (estimate). */
const CHAR_WIDTH_RATIO = 0.58;
const PADDING_PX = 2;
const MIN_VISIBLE_CHARS = 3;
const ELLIPSIS = '…';

export type MeasureText = (text: string, fontPx: number) => number;

export interface LabelLayout {
  text: string;
  /** True when the name runs along the element's depth (drawn turned by 90 degrees). */
  along: boolean;
  /**
   * False only for a selected element whose full name is wider than the element: the
   * renderer then shows the name on a tag beside the element instead of inside it.
   */
  fits: boolean;
}

export function estimateTextWidth(text: string, fontPx: number): number {
  return text.length * fontPx * CHAR_WIDTH_RATIO;
}

export function fitLabel(
  label: string,
  widthPx: number,
  heightPx: number,
  fontPx: number,
  selected: boolean,
  measure: MeasureText = estimateTextWidth,
): LabelLayout | null {
  const text = label.trim();
  if (text.length === 0) return null;
  const needed = measure(text, fontPx);
  const lineHeight = fontPx + 3;

  // Run along the depth when the element is clearly taller than wide and the name does not
  // fit across.
  const along = heightPx > widthPx * 1.3 && needed > widthPx - PADDING_PX;
  const available = (along ? heightPx : widthPx) - PADDING_PX;
  const thickness = along ? widthPx : heightPx;

  const fits = needed <= available && thickness >= lineHeight;
  if (selected) return { text, along, fits };
  if (thickness < lineHeight) return null;
  if (fits) return { text, along, fits: true };

  for (let n = text.length - 1; n >= MIN_VISIBLE_CHARS; n--) {
    const candidate = `${text.slice(0, n).trimEnd()}${ELLIPSIS}`;
    if (measure(candidate, fontPx) <= available) return { text: candidate, along, fits: true };
  }
  return null;
}
