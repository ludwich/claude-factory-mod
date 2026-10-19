import type { ForemanView, Palette } from './types.ts'
import { clawd, esc, WHIP_SYNC } from './clawd.ts'

// Claude the foreman: the original orange Clawd in a stovepipe hat,
// handlebar moustache and waistcoat. Local sprite frame (scale S): feet
// centre at (0,0), body up to y -40, hat crown up to y -80.

const S = 1.8
const IMPACT = `Impact, 'Arial Black', 'Arial Narrow', sans-serif`

const R = (x: number, y: number, w: number, h: number, fill: string, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`

const n1 = (v: number) => Math.round(v * 10) / 10

/** Stovepipe hat. `tilt` in degrees. */
function hat(p: Palette, tilt: number, hop = ''): string {
  const edge = ` stroke="${p.metal}" stroke-width="1"`
  return (
    `<g>${hop}<g transform="rotate(${tilt} 0 -44)">` +
    R(-15, -80, 30, 36, p.ink, edge) +
    R(-14, -78, 2, 32, p.metalLight, ' opacity="0.85"') + R(-10, -78, 1, 26, p.metal) +
    R(-15, -80, 30, 2, p.metal) +
    R(-12, -77, 3, 25, p.metalDark) +
    R(-15, -51, 30, 6, p.danger) +
    R(6, -50, 4, 4, p.accent) +
    R(-23, -45, 46, 5, p.ink, edge) +
    R(-23, -45, 46, 1.5, p.metalLight) + R(-23, -41.5, 46, 1, p.metal) +
    `</g></g>`
  )
}

/** Handlebar moustache, waistcoat, watch chain, boots (bar the tapping one). */
function costume(p: Palette, mouth: string): string {
  const stache =
    `<polygon fill="${p.ink}" points="0,-21 -8,-21 -15,-20 -19,-22 -20,-25 -22,-27 -24,-24 -22,-19 -16,-16 -8,-15.5 0,-17 ` +
    `8,-15.5 16,-16 22,-19 24,-24 22,-27 20,-25 19,-22 15,-20 8,-21"/>`
  const vest =
    `<polygon points="-24,-28 -11,-17 -6,-9 -24,-9" fill="${p.metalDark}"/>` +
    `<polygon points="24,-28 11,-17 6,-9 24,-9" fill="${p.metalDark}"/>` +
    `<path d="M-24,-28 L-11,-17 L-6,-9 M24,-28 L11,-17 L6,-9" stroke="${p.metal}" stroke-width="1" fill="none"/>` +
    R(-11, -14, 2.5, 2.5, p.accent) + R(-9, -11, 2.5, 2.5, p.accent) + R(8.5, -14, 2.5, 2.5, p.accent) + R(6.5, -11, 2.5, 2.5, p.accent) +
    `<path d="M-9,-10 Q-15,-1 -21,-11" stroke="${p.accent}" stroke-width="1.5" fill="none"/>` +
    R(-23, -14, 3.5, 4, p.accent)
  const boots = R(-23, -3, 7, 3, p.ink) + R(-12, -3, 7, 3, p.ink) + R(5, -3, 7, 3, p.ink)
  return vest + stache + mouth + boots
}

function puff(x: number, y: number, dx: number, begin: number, p: Palette): string {
  return (
    `<g opacity="0">${R(x, y, 8, 7, p.paper)}${R(x + 5, y - 6, 6, 6, p.paper)}${R(x - 2, y - 3, 4, 4, p.smoke)}` +
    `<animateTransform attributeName="transform" type="translate" values="0,0;${dx},-14" dur="0.8s" begin="${begin}s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="0.7;0" dur="0.8s" begin="${begin}s" repeatCount="indefinite"/></g>`
  )
}

function whipping(f: ForemanView, p: Palette): string {
  // every beat of the whip shares one 1.2s cycle, CRACK at 0.6 (and at t=0, so stills show the hit)
  const t = WHIP_SYNC
  const pulse =
    `<rect x="-24" y="-40" width="48" height="28" fill="${p.danger}" opacity="0">` +
    `<animate attributeName="opacity" values="0.1;0.1;0.6;0.3;0.1" keyTimes="0;0.55;0.6;0.75;1" ${t}/></rect>`
  const vein = `<polyline points="11,-37 14,-39.5 16,-36.5 19,-39 21,-36.5" stroke="${p.danger}" stroke-width="1.6" fill="none" stroke-linejoin="miter">` +
    `<animate attributeName="stroke-width" values="1.4;1.4;2.4;1.4" keyTimes="0;0.55;0.6;1" ${t}/></polyline>`
  const brows =
    `<polygon points="-20,-38 -6,-33 -6,-31 -20,-35" fill="${p.ink}"/>` +
    `<polygon points="20,-38 6,-33 6,-31 20,-35" fill="${p.ink}"/>`
  const mouth =
    `<g>${R(-7, -16, 14, 9, p.ink)}${R(-6, -16, 12, 2, '#fff')}${R(-4, -10, 8, 3, p.danger)}` +
    `<animateTransform attributeName="transform" type="translate" values="0,0;0,0;0,1.5;0,0;0,1.5;0,0;0,1.5;0,0;0,0" keyTimes="0;0.4;0.45;0.5;0.55;0.6;0.65;0.7;1" ${t}/></g>`
  const arm = R(28, -28, 6, 7, p.clawd) + R(33, -30, 6, 7, p.clawd) + R(38, -32, 6, 6, p.clawdDark) + R(28, -22, 11, 1.5, p.clawdDark)
  const fist = R(-33, -30, 10, 6, p.clawd) + R(-33, -25, 10, 1.5, p.clawdDark) +
    `<g>${R(-36, -32, 7, 7, p.clawd)}${R(-36, -32, 7, 1.5, p.clawdDark)}${R(-31, -34, 3, 3, p.clawd)}${R(-36, -27, 7, 2, p.clawdDark)}` +
    `<path d="M-40,-36 l-3,-3 M-41,-30 l-4,0 M-39,-25 l-3,3" stroke="${p.ink}" stroke-width="1.2"/>` +
    `<animateTransform attributeName="transform" type="translate" values="0,0;0,0;-2,-3;0,0;-1,-4;0,0;-2,-3;0,0" keyTimes="0;0.4;0.46;0.52;0.58;0.64;0.7;1" ${t}/></g>`
  const steam = puff(-26, -46, -6, 0, p) + puff(22, -46, 6, 0.4, p) + puff(-22, -48, -3, 0.2, p)
  const over = pulse + brows + vein + costume(p, mouth) + R(16, -3, 7, 3, p.ink) + hat(p, -4, `<animateTransform attributeName="transform" type="translate" values="0,0;0,0;0,-5;0,0;0,0" keyTimes="0;0.58;0.62;0.7;1" ${t}/>`) + arm + fist + steam
  const body = clawd({ x: f.x, y: f.y, scale: S, body: p.clawd, shade: p.clawdDark, eyes: 'angry', ink: p.ink, over })

  // the whip, in scene coordinates
  const hx = n1(f.x + 42 * S), hy = n1(f.y - 30 * S)
  const wx = hx + 13, wy = hy - 14
  const tx = f.targetX !== undefined ? f.targetX - 24 : f.x + 210
  const ty = f.targetY !== undefined ? f.targetY - 56 : f.y - 70
  const dx = tx - wx
  const d = (c1x: number, c1y: number, c2x: number, c2y: number, ex: number, ey: number) =>
    `M${wx},${wy} C${n1(c1x)},${n1(c1y)} ${n1(c2x)},${n1(c2y)} ${n1(ex)},${n1(ey)}`
  // sidearm lash: every frame stays below the shout bubble (y > ~238) and right of the face
  const back = d(wx + 30, wy + 18, wx + 44, wy + 60, wx + 16, f.y - 4)
  // after the crack the lash droops along the eye-line toward the target, never onto a neighbour
  const dropX = wx + dx * 0.75
  // long reaches get a real S-curve (belly sagging under the bubble, then
  // a snap up into the tip) so a far target never reads as a clothesline
  const reach = Math.max(0, dx - 200)
  const belly = Math.min(46, reach * 0.09)
  const crackD = d(wx + dx * 0.3, wy + 6 + belly, wx + dx * 0.72, ty - 34 - belly * 0.8, tx, ty)
  const frames = [
    back, // trailing on the platform, wound back
    d(wx + 40, wy - 6, wx + 80, wy + 6, wx + 120, wy - 4), // flung out sideways
    crackD, // CRACK
    crackD, // ...held so the eye can follow foreman -> whip -> target
    d(wx + dx * 0.3, wy + 2, wx + dx * 0.6, ty + 24, tx - dx * 0.06, ty + 8), // ripple
    d(wx + dx * 0.25, wy + 16, wx + dx * 0.5, ty + 28, dropX, ty + 24), // droop
    back,
  ]
  const anim = `<animate attributeName="d" values="${frames.join(';')}" keyTimes="0;0.45;0.58;0.7;0.78;0.9;1" ${t}/>`
  const whip =
    `<path d="${frames[2]}" stroke="${p.ink}" stroke-width="3.5" fill="none" stroke-linecap="round">${anim}</path>` +
    `<path d="${frames[2]}" stroke="${p.accentAlt}" stroke-width="1.2" fill="none" stroke-dasharray="3 4">${anim}</path>` +
    `<line x1="${hx - 2}" y1="${hy + 2}" x2="${wx}" y2="${wy}" stroke="${p.accentAlt}" stroke-width="5"/>` +
    `<line x1="${hx + 4}" y1="${hy - 4}" x2="${wx}" y2="${wy}" stroke="${p.accent}" stroke-width="2"/>`

  // starburst at the tip, timed to the snap
  let star = ''
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const rr = i % 2 ? 9 : 22 + (i % 4 === 0 ? 4 : 0)
    star += `${n1(Math.cos(a) * rr * 1.25)},${n1(Math.sin(a) * rr)} `
  }
  star = star.trim()
  const ck = 'keyTimes="0;0.56;0.6;0.68;0.8;1"'
  const crack =
    `<g transform="translate(${n1(tx)},${n1(ty - 6)})">` +
    `<g opacity="0"><animate attributeName="opacity" values="0;0;1;1;0;0" ${ck} ${t}/>` +
    `<animateTransform attributeName="transform" type="scale" values="0.3;0.3;1.25;1;0.9;0.3" ${ck} ${t}/>` +
    `<polygon points="${star}" fill="${p.accent}" stroke="${p.ink}" stroke-width="2.5"/>` +
    `<polygon points="${star}" fill="${p.paper}" transform="scale(0.8)"/>` +
    `<text x="0" y="4" text-anchor="middle" font-family="${IMPACT}" font-size="11" font-weight="bold" fill="${p.danger}" stroke="${p.ink}" stroke-width="0.6" transform="rotate(-10)">CRACK!</text>` +
    `</g></g>`

  return (
    `<g><animateTransform attributeName="transform" type="translate" values="0,0;0,-2;3,-6;0,0;0,0" keyTimes="0;0.45;0.6;0.75;1" ${t}/>` +
    body + whip + crack + `</g>`
  )
}

function solo(f: ForemanView, p: Palette): string {
  const t = 'dur="0.7s" repeatCount="indefinite"'
  const kt = 'keyTimes="0;0.1;0.45;0.85;1"'
  const brows =
    `<polygon points="-19,-37 -7,-33 -7,-31 -19,-34" fill="${p.ink}"/>` +
    `<polygon points="19,-37 7,-33 7,-31 19,-34" fill="${p.ink}"/>`
  const mouth = R(-7, -16, 14, 5, p.ink) + R(-6, -15, 12, 3, '#fff') + R(-2, -15, 1, 3, p.ink) + R(2, -15, 1, 3, p.ink)
  const cuffs = R(-30, -28, 6, 2, p.paper)
  const drop = (x: number, b: number) =>
    `<g opacity="0">${R(x, -36, 2, 3, '#fff')}${R(x - 0.5, -34, 3, 2, '#fff')}` +
    `<animateTransform attributeName="transform" type="translate" values="0,0;-2,16" dur="0.9s" begin="${b}s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="0.9;0.9;0" dur="0.9s" begin="${b}s" repeatCount="indefinite"/></g>`
  const anvil =
    `<g stroke="${p.ink}" stroke-width="1">` +
    R(27, -5, 20, 5, p.metal) + R(32, -11, 10, 6, p.metalDark) +
    `<polygon points="25,-16 49,-16 54,-14.5 49,-11 25,-11" fill="${p.metal}"/>` + `</g>` +
    R(25.5, -15.5, 23, 1.5, p.metalLight) + R(28, -3, 18, 1, p.metalLight) +
    `<rect x="34" y="-18.5" width="10" height="2.5" fill="${p.accentAlt}">` +
    `<animate attributeName="fill" values="${p.accent};${p.accentAlt};${p.accentAlt};${p.accent}" keyTimes="0;0.2;0.99;1" ${t}/></rect>`
  // forearm out of the right nub, gripping the hammer; struck pose at rotation 0
  const hammer =
    `<g>${R(31, -23.5, 12, 2.5, p.metalLight)}${R(38, -27, 8, 8.5, p.ink)}${R(38, -27, 8, 1.5, p.metalLight)}` +
    `${R(24, -27, 10, 6, p.clawd)}${R(24, -22, 10, 1.5, p.clawdDark)}${R(32, -26, 3, 4, p.clawdDark)}${R(24, -28, 2, 8, p.paper)}` +
    `<animateTransform attributeName="transform" type="rotate" values="0 26 -24;-6 26 -24;-60 26 -24;-60 26 -24;0 26 -24" ${kt} ${t}/></g>`
  let sparks = ''
  const sp: [number, number][] = [[-8, -10], [6, -12], [12, -4], [-11, -3], [0, -14]]
  for (const [sx, sy] of sp) {
    sparks += `<rect x="41" y="-19" width="2" height="2" fill="${p.accent}" opacity="0">` +
      `<animate attributeName="opacity" values="1;0;0;1" keyTimes="0;0.2;0.99;1" ${t}/>` +
      `<animateTransform attributeName="transform" type="translate" values="0,0;${sx},${sy};${sx},${sy};0,0" keyTimes="0;0.2;0.99;1" ${t}/></rect>`
  }
  sparks += `<text x="36" y="-32" font-family="${IMPACT}" font-size="8" fill="${p.accent}" stroke="${p.ink}" stroke-width="0.5" transform="rotate(-20 36 -32)">CLANG!` +
    `<animate attributeName="opacity" values="1;1;0;0;1" keyTimes="0;0.25;0.3;0.99;1" ${t}/></text>`
  const grawlix =
    `<text x="-44" y="-56" font-family="${IMPACT}" font-size="8" fill="${p.danger}" stroke="${p.ink}" stroke-width="0.3" transform="rotate(-12 -44 -56)">#@%&amp;!` +
    `<animate attributeName="opacity" values="1;0.2;1" dur="0.5s" repeatCount="indefinite"/></text>`
  const over = brows + costume(p, mouth) + R(16, -3, 7, 3, p.ink) + cuffs + hat(p, 7) +
    drop(-27, 0) + drop(25, 0.45) + anvil + hammer + sparks + grawlix
  return clawd({ x: f.x, y: f.y, scale: S, body: p.clawd, shade: p.clawdDark, eyes: 'angry', ink: p.ink, over })
}

function idle(f: ForemanView, p: Palette): string {
  const brow = `<polygon points="7,-35 15,-37 15,-35.5 7,-33.5" fill="${p.ink}"/>` + R(-15, -31, 7, 1.5, p.ink)
  const smirk = `<path d="M-4,-11.5 L4,-11.5 L9,-14.5" stroke="${p.ink}" stroke-width="2" fill="none"/>` +
    R(9, -14, 2, 2, p.clawdDark)
  const steam = (x: number, b: number) =>
    `<g opacity="0">${R(x, -38, 2, 3, p.smoke)}${R(x + 1, -42, 2, 3, p.smoke)}` +
    `<animateTransform attributeName="transform" type="translate" values="0,0;1,-8" dur="1.6s" begin="${b}s" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="0.8;0" dur="1.6s" begin="${b}s" repeatCount="indefinite"/></g>`
  // teacup in the left nub, pinky out, sipped now and then
  const cup =
    `<g>${R(-45, -24, 16, 2, p.paper)}${R(-42, -32, 10, 8, p.paper)}${R(-42, -32, 10, 1.5, p.accent)}` +
    `${R(-46, -30, 3, 4, 'none', ` stroke="${p.paper}" stroke-width="1.2"`)}${R(-34, -28, 8, 7, p.clawd)}${R(-34, -22, 8, 1.5, p.clawdDark)}${R(-33, -36, 3, 6, p.clawd, ' transform="rotate(25 -31.5 -30)"')}` +
    steam(-39, 0) + steam(-35, 0.8) +
    `<animateTransform attributeName="transform" type="translate" values="0,0;0,0;5,-4;5,-4;0,0;0,0" keyTimes="0;0.55;0.62;0.8;0.86;1" dur="5s" repeatCount="indefinite"/></g>`
  // pocket watch on its chain, ticking
  const watch =
    `<path d="M8,-11 Q22,-4 31,-22" stroke="${p.accent}" stroke-width="1" fill="none"/>` +
    `<circle cx="34" cy="-24" r="5" fill="${p.accent}"/><circle cx="34" cy="-24" r="3.6" fill="${p.paper}"/>` +
    `<rect x="33.6" y="-27" width="0.8" height="3" fill="${p.ink}"><animateTransform attributeName="transform" type="rotate" values="0 34 -24;360 34 -24" dur="4s" repeatCount="indefinite"/></rect>` +
    R(33, -30, 2, 2, p.accent)
  // whip coiled on the hip
  const coil =
    R(-26, -23, 4, 6, p.accentAlt) + R(-26, -23, 4, 1, p.accent) +
    `<g fill="none" stroke="${p.ink}" stroke-width="2.2"><ellipse cx="-29" cy="-15" rx="5.5" ry="4.5"/><ellipse cx="-29" cy="-15" rx="3" ry="2.4"/></g>` +
    `<g fill="none" stroke="${p.accentAlt}" stroke-width="0.8"><ellipse cx="-29" cy="-15" rx="5.5" ry="4.5"/></g>` +
    `<path d="M-33,-12 Q-36,-6 -33,-3 Q-31,-1 -34,1" stroke="${p.ink}" stroke-width="1.3" fill="none"/>`
  const tap =
    `<g>${R(16, -3, 7, 3, p.ink)}<animateTransform attributeName="transform" type="translate" values="0,0;0,0;0,-3;0,0;0,-3;0,0" keyTimes="0;0.6;0.68;0.76;0.84;1" dur="2.4s" repeatCount="indefinite"/></g>`
  const over = brow + costume(p, smirk) + tap + hat(p, 0) + coil + watch + cup
  return clawd({ x: f.x, y: f.y, scale: S, body: p.clawd, shade: p.clawdDark, eyes: 'tired', ink: p.ink, bob: 3, over })
}

/** Tiny brass plaque on the platform: the foreman's own tally. */
function plaque(f: ForemanView, p: Palette): string {
  const label = `TOOLS SWUNG: ${f.tools}`
  const sub = f.mode === 'idle' ? 'TEA BREAK: NEVER' : f.mode === 'solo' ? 'STAFF: ME. ONLY ME' : ''
  const w = Math.max(label.length, sub.length) * 6 + 14
  // with a sub-line, the plaque flips between the tally and the sub-line
  const flip = (a: string) => sub ? `<animate attributeName="opacity" values="${a}" keyTimes="0;0.5;1" calcMode="discrete" dur="6s" repeatCount="indefinite"/>` : ''
  return (
    `<g transform="translate(${f.x},${f.y + 7})" shape-rendering="crispEdges">` +
    R(-w / 2, 0, w, 15, p.metalDark, ` stroke="${p.accent}" stroke-width="1"`) +
    R(-w / 2 + 3, 3, 2, 2, p.accent) + R(w / 2 - 5, 3, 2, 2, p.accent) +
    `<text x="0" y="11" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="${p.accent}">${esc(label)}${flip('1;0;1')}</text>` +
    (f.mode === 'whipping'
      ? `<text x="${n1(w / 2 + 3)}" y="10" font-family="${IMPACT}" font-size="10" fill="${p.danger}" stroke="${p.ink}" stroke-width="0.5" opacity="0">+1` +
        `<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.6;0.62;0.85;1" ${WHIP_SYNC}/>` +
        `<animateTransform attributeName="transform" type="translate" values="0,0;0,0;0,-6" keyTimes="0;0.6;1" ${WHIP_SYNC}/></text>`
      : '') +
    (sub ? `<text x="0" y="11" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="${p.danger}" opacity="0">${sub}${flip('0;1;0')}</text>` : '') +
    `</g>`
  )
}

/** Claude the foreman: top hat, moustache, whip, on a platform. */
export function foreman(f: ForemanView, p: Palette): string {
  const body = f.mode === 'whipping' ? whipping(f, p) : f.mode === 'solo' ? solo(f, p) : idle(f, p)
  return `<g shape-rendering="crispEdges">${body}</g>` + plaque(f, p)
}

/** Word-wrap to at most `max` lines of `width` chars, ellipsis on overflow. */
function wrap(text: string, width: number, max: number): string[] {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (let w of words) {
    while (w.length > width) {
      if (cur) { lines.push(cur); cur = '' }
      lines.push(w.slice(0, width))
      w = w.slice(width)
    }
    if (!w) continue
    if (!cur) cur = w
    else if (cur.length + 1 + w.length <= width) cur += ' ' + w
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  if (lines.length > max) {
    lines.length = max
    const last = lines[max - 1]!
    lines[max - 1] = (last.length >= width ? last.slice(0, width - 1) : last) + '…'
  }
  return lines
}

/** The SCREAM bubble: spiky comic starburst. (x,y) = point above the foreman's head. */
export function shoutBubble(text: string, x: number, y: number, p: Palette): string {
  if (!text || !text.trim()) return ''
  const lines = wrap(text, 34, 4)
  const maxLen = Math.max(4, ...lines.map(l => l.length))
  const tw = maxLen * 7.5, lh = 17, th = lines.length * lh
  const rx = (tw / 2) * 1.1 + 24, ry = (th / 2) * 1.25 + 18
  const spike = 1.22
  const ox = rx * spike, oy = ry * spike
  // below the motto ribbon (y ~120) when it fits, never down into the conveyor
  const cy = Math.min(Math.max(6 + oy, y - 14 - oy, 124 + oy), Math.max(6 + oy, 266 - oy))
  const cx = Math.max(10 + ox, Math.min(640 - ox, x + 40 + ox))
  // jagged outline: valleys on the ellipse, spikes beyond it
  const N = Math.max(18, Math.round((rx + ry) / 11) * 2)
  const pts: string[] = []
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + 0.13
    const k = i % 2 ? 1 : spike - ((i * 7) % 5) * 0.035
    pts.push(`${n1(cx + Math.cos(a) * rx * k)},${n1(cy + Math.sin(a) * ry * k)}`)
  }
  const poly = pts.join(' ')
  // zig-zag tail from the lower-left down toward the mouth
  // tail runs down the RIGHT side of the head (outside the hat brim) to the moustache/mouth corner
  const ey = (bx: number) => cy + ry * Math.sqrt(Math.max(0, 1 - ((bx - cx) / rx) ** 2))
  const b1x = Math.max(x + 44, cx - rx * 0.88), b2x = b1x + 24
  const b1y = ey(b1x) - 8, b2y = ey(b2x) - 8
  const tipx = x + 22, tipy = y + 53
  // lightning-bolt kink: both edges jog right ~55% of the way down
  const L = (ax: number, ay: number, t: number): [number, number] => [ax + (tipx - ax) * t, ay + (tipy - ay) * t]
  const [l1x, l1y] = L(b1x, b1y, 0.55), [r1x, r1y] = L(b2x, b2y, 0.5)
  const tail = `${n1(b1x)},${n1(b1y)} ${n1(l1x + 7)},${n1(l1y)} ${n1(l1x + 3)},${n1(l1y + 3)} ${n1(tipx)},${n1(tipy)} ${n1(r1x + 2)},${n1(r1y + 2)} ${n1(r1x + 6)},${n1(r1y - 2)} ${n1(b2x)},${n1(b2y)}`
  const tailIn = `${n1(b1x + 3)},${n1(b1y - 8)} ${n1(b2x - 3)},${n1(b2y - 8)} ${n1(b2x - 4)},${n1(b2y + 4)} ${n1(b1x + 4)},${n1(b1y + 4)}`
  const y0 = cy - th / 2 + lh - 4
  const tspans = lines.map((l, i) => `<tspan x="${n1(cx)}" y="${n1(y0 + i * lh)}">${esc(l)}</tspan>`).join('')
  const ticks = [-0.5, 0.25].map(a => {
    const c = Math.cos(a), s = Math.sin(a)
    return `<line x1="${n1(cx + c * rx * 1.3)}" y1="${n1(cy + s * ry * 1.3)}" x2="${n1(cx + c * rx * 1.42)}" y2="${n1(cy + s * ry * 1.42)}"/>`
  }).join('')
  return (
    `<g>` +
    `<animateTransform attributeName="transform" type="translate" values="0,0;2,-1.5;-2,1.5;1.5,1;-1.5,-1;0,0;0.6,-0.4;0,0" keyTimes="0;0.06;0.12;0.18;0.24;0.3;0.65;1" dur="1.2s" repeatCount="indefinite"/>` +
    `<g stroke="${p.accent}" stroke-width="3">${ticks}</g>` +
    `<polygon points="${poly}" fill="${p.ink}" transform="translate(4,4)" opacity="0.5"/>` +
    `<polygon points="${tail}" fill="${p.paper}" stroke="${p.ink}" stroke-width="3"/>` +
    `<polygon points="${poly}" fill="${p.paper}" stroke="${p.ink}" stroke-width="3.5"/>` +
    `<polygon points="${tailIn}" fill="${p.paper}"/>` +
    `<text text-anchor="middle" font-family="${IMPACT}" font-size="15" font-weight="bold" letter-spacing="0.4" fill="${p.ink}">${tspans}</text>` +
    `</g>`
  )
}
