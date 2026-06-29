/**
 * Straight-connector geometry shared by the build step and the WYSIWYG editor.
 *
 * Once a diagram is hand-placed in the editor, ELK's orthogonal routing no longer
 * matches the boxes, so we draw edges as straight lines clipped to each box border.
 * Keeping this in core means the live editor and the rebuilt deck use identical math.
 */

export interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** The point on `box`'s border lying on the ray from its center toward `towards`. */
function borderPoint(box: BoxRect, towards: Point): Point {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = towards.x - cx;
  const dy = towards.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hw = box.width / 2;
  const hh = box.height / 2;
  const tx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const ty = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t };
}

/** A 2-point polyline from the border of `a` to the border of `b`, center-to-center. */
export function connector(a: BoxRect, b: BoxRect): Point[] {
  const centerA = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const centerB = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  return [borderPoint(a, centerB), borderPoint(b, centerA)];
}
