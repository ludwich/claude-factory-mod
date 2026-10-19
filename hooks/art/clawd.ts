import type { Palette } from './types.ts'
import { WHIP_CYCLE, WHIP_PHASE } from './types.ts'
// Clawd: Claude Code's little orange pixel mascot. Every character in the
// factory is built on this one sprite so they all read as "Claude".
//
// Coordinate convention (the whole art kit uses it): (0,0) is the centre
// between the feet; the body stands upward into negative y. At scale 1 the
// sprite is 60 wide (x -30..30) and 40 tall (y -40..0). Arms are the side
// nubs at y -28..-20. The top of the head is y = -40 * scale.

export type ClawdEyes = 'normal' | 'angry' | 'tired' | 'happy' | 'dead' | 'closed' | 'wide'

export type ClawdOptions = {
  x?: number
  y?: number
  scale?: number
  body: string
  shade: string
  eyes?: ClawdEyes
  /** eye / pupil colour */
  ink?: string
  /** gentle up-down bob (SMIL); seconds per cycle, 0 = still */
  bob?: number
  /** extra SVG drawn inside the sprite's local frame, behind the body */
  behind?: string
  /** extra SVG drawn inside the sprite's local frame, over the body */
  over?: string
  /** mirror horizontally */
  flip?: boolean
}

const r = (x: number, y: number, w: number, h: number, fill: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`

function eyes(kind: ClawdEyes, ink: string): string {
  switch (kind) {
    case 'angry':
      return (
        r(-14, -31, 5, 9, ink) + r(9, -31, 5, 9, ink) +
        `<polygon points="-18,-36 -7,-32 -7,-30 -18,-33" fill="${ink}"/>` +
        `<polygon points="18,-36 7,-32 7,-30 18,-33" fill="${ink}"/>`
      )
    case 'tired':
      return r(-14, -27, 5, 4, ink) + r(9, -27, 5, 4, ink) +
        r(-15, -29, 7, 1.5, ink) + r(8, -29, 7, 1.5, ink)
    case 'happy':
      return `<path d="M-15,-25 l3.5,-5 l3.5,5 M8,-25 l3.5,-5 l3.5,5" stroke="${ink}" stroke-width="2.5" fill="none"/>`
    case 'dead':
      return `<path d="M-15,-32 l6,8 M-9,-32 l-6,8 M9,-32 l6,8 M15,-32 l-6,8" stroke="${ink}" stroke-width="2.5"/>`
    case 'closed':
      return r(-15, -26, 7, 2.5, ink) + r(8, -26, 7, 2.5, ink)
    case 'wide':
      return r(-15, -33, 7, 11, ink) + r(8, -33, 7, 11, ink) +
        r(-13, -31, 2, 2, '#fff') + r(10, -31, 2, 2, '#fff')
    default:
      return r(-14, -32, 5, 10, ink) + r(9, -32, 5, 10, ink)
  }
}

/** The bare sprite: body block, side nubs, four legs, eyes. */
export function clawdBody(o: Pick<ClawdOptions, 'body' | 'shade' | 'eyes' | 'ink'>): string {
  const ink = o.ink ?? '#1a1a1a'
  return (
    // legs
    r(-22, -8, 5, 8, o.shade) + r(-11, -8, 5, 8, o.shade) +
    r(6, -8, 5, 8, o.shade) + r(17, -8, 5, 8, o.shade) +
    // side nubs (arms)
    r(-30, -28, 6, 8, o.body) + r(24, -28, 6, 8, o.body) +
    // body
    r(-24, -40, 48, 32, o.body) +
    // bottom shade strip for depth
    r(-24, -12, 48, 4, o.shade) +
    eyes(o.eyes ?? 'normal', ink)
  )
}

/** A full, positioned Clawd with optional bob, accessories and flip. */
export function clawd(o: ClawdOptions): string {
  const s = o.scale ?? 1
  const flip = o.flip ? ' scale(-1,1)' : ''
  const bob = o.bob
    ? `<animateTransform attributeName="transform" type="translate" values="0,0;0,-2;0,0" dur="${o.bob}s" repeatCount="indefinite"/>`
    : ''
  return (
    `<g transform="translate(${o.x ?? 0},${o.y ?? 0}) scale(${s})${flip}" shape-rendering="crispEdges">` +
    `<g>${bob}${o.behind ?? ''}${clawdBody(o)}${o.over ?? ''}</g>` +
    `</g>`
  )
}

/** Shift a #rrggbb colour's hue by `deg` and lightness by `dl` (-1..1). */
export function tint(hex: string, deg: number, dl = 0): string {
  const n = parseInt(hex.slice(1), 16)
  let rr = ((n >> 16) & 255) / 255, gg = ((n >> 8) & 255) / 255, bb = (n & 255) / 255
  const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb)
  let h = 0, sat = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === rr ? (gg - bb) / d + (gg < bb ? 6 : 0) : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4
    h *= 60
  }
  h = (h + deg + 360) % 360
  const L = Math.min(1, Math.max(0, l + dl))
  const c = (1 - Math.abs(2 * L - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = L - c / 2
  const [a, b, cc] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${to(a)}${to(b)}${to(cc)}`
}

/** Escape text for SVG. */
export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Every worker's sprite scale (the foreman is 1.8, so the hierarchy holds). */
export const WORKER_SCALE = 1.1

/** Timing attributes for anything synced to the foreman's whip crack. */
export const WHIP_SYNC = `dur="${WHIP_CYCLE}s" begin="-${+(WHIP_CYCLE * WHIP_PHASE).toFixed(2)}s" repeatCount="indefinite"`

/** Wrap a whipped worker: still, JUMP on the crack (0.6), settle. */
export function flinch(inner: string, dy = -9): string {
  return `<g><animateTransform attributeName="transform" type="translate" values="0,0;0,0;1,${dy};-1,-2;0,0" keyTimes="0;0.58;0.62;0.75;1" ${WHIP_SYNC}/>${inner}</g>`
}

/** The one true OW!: pops on the crack, rises, fades. (x,y) = text centre-baseline. */
export function ow(x: number, y: number, p: Palette): string {
  return (
    `<g transform="translate(${x},${y}) rotate(-8)" opacity="0">` +
    `<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.58;0.6;0.9;1" ${WHIP_SYNC}/>` +
    `<g><animateTransform attributeName="transform" type="translate" values="0,4;0,4;0,0;0,-6;0,-6" keyTimes="0;0.58;0.62;0.95;1" ${WHIP_SYNC}/>` +
    `<text text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="16" letter-spacing=".5" fill="${p.danger}" stroke="${p.ink}" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke">OW!</text>` +
    `</g></g>`
  )
}
