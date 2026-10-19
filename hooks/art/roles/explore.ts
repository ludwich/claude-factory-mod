import type { Palette, WorkerView } from '../types.ts'
import { clawd, esc, flinch, ow, tint, WHIP_SYNC, WORKER_SCALE } from '../clawd.ts'
import type { ClawdEyes } from '../clawd.ts'

// Explore: a Clawd prospector hacking 'code ore' out of a coal face, headlamp
// sweeping, mine cart filling up. Local frame: (0,0) = feet-centre of slot.

const R = (x: number, y: number, w: number, h: number, f: string, a = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${a}/>`
/** Several same-colour rects as one path: [x,y,w,h,...]. */
const P = (f: string, ...q: number[]) => {
  let d = ''
  for (let i = 0; i < q.length; i += 4) d += `M${q[i]} ${q[i + 1]}h${q[i + 2]}v${q[i + 3]}h${-q[i + 2]!}z`
  return `<path d="${d}" fill="${f}"/>`
}
const IND = 'repeatCount="indefinite"'
const T = (x: number, y: number, s: string, f: string, size = 8, a = '') =>
  `<text x="${x}" y="${y}"${size === 8 ? '' : ` font-size="${size}"`} fill="${f}"${a}>${esc(s)}</text>`
const blink = (dur: number, begin: number, vals = '0;1;0') =>
  `<animate attributeName="opacity" values="${vals}" dur="${dur}s" begin="${begin}s" ${IND}/>`
const INK = (p: Palette) => ` stroke="${p.ink}"`
const OUT = (p: Palette, wd = 2) => ` stroke="${p.ink}" stroke-width="${wd}" paint-order="stroke"`

/** Pull a colour toward its own grey (earthy, dusty), k in 0..1. */
function desat(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const g = 0.3 * c[0]! + 0.59 * c[1]! + 0.11 * c[2]!
  return '#' + c.map(v => Math.round(v + (g - v) * k).toString(16).padStart(2, '0')).join('')
}

const mix = (a: string, b: string, k: number) => {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16)
  return '#' + [16, 8, 0].map(sh => Math.round(((A >> sh) & 255) * (1 - k) + ((B >> sh) & 255) * k).toString(16).padStart(2, '0')).join('')
}

const GLYPHS = ['{}', ';', '<>', '()', '</>', '[]', '#', '=>']
const CX = 4 // character x
const S = WORKER_SCALE

/** The coal face of code ore: strata, a glinting vein and glyph nuggets. */
function rock(p: Palette, seed: number, failed: boolean): string {
  const g = (i: number) => GLYPHS[(seed + i * 3) % GLYPHS.length]!
  const spots: [number, number][] = [[-70, -84], [-62, -68], [-70, -36], [-58, -20], [-68, -6]]
  let s =
    `<polygon points="-75,4 -75,-100 -62,-106 -50,-96 -46,-80 -40,-70 -44,-52 -36,-40 -42,-22 -34,-8 -36,4" fill="${mix(p.metalDark, p.metal, 0.6)}" stroke="${p.ink}" stroke-width="1.5"/>` +
    P(p.metal, -75, -78, 29, 2, -75, -58, 31, 1, -75, -44, 38, 2, -75, -26, 33, 1, -75, -12, 39, 1) +
    `<polygon points="-75,-100 -62,-106 -50,-96 -58,-92 -75,-90" fill="${p.metal}"/>` +
    `<polygon points="-46,-80 -40,-70 -44,-52 -48,-62" fill="${p.metal}"/>` +
    `<polygon points="-42,-22 -34,-8 -36,4 -44,4 -40,-10" fill="${p.metal}"/>` +
    P(p.bgDeep, -66, -72, 8, 2, -72, -50, 8, 2, -64, -32, 2, 7) +
    // zigzag vein of ore
    P(p.accent, -52, -4, 2, 6, -54, -10, 2, 6, -52, -16, 2, 6, -50, -24, 2, 8, -52, -30, 2, 6, -54, -38, 2, 8, -52, -46, 2, 8, -50, -54, 2, 8, -52, -62, 2, 8, -54, -70, 2, 8)
  spots.forEach(([x, y], i) => {
    s += T(x, y, g(i), i % 2 ? p.accent : p.accentAlt)
    if (i % 2 === 0) s += `<g>${R(x + 6, y - 9, 2, 2, '#fff')}${blink(1.6 + i * 0.3, -((seed + i) % 10) / 5)}</g>`
  })
  if (failed) {
    for (let i = 0; i < 2; i++) {
      s += `<g opacity="0">${P(p.smoke, -62 + i * 7, -98, 10, 8, -60 + i * 7, -102, 6, 4)}` +
        `<animateTransform attributeName="transform" type="translate" values="0,0;-4,-8" dur="1.8s" begin="${i * 0.6}s" ${IND}/>` +
        `${blink(1.8, i * 0.6, '0;0.8;0')}</g>`
    }
    s += `<g>${R(-42, -46, 3, 3, p.accent)}${R(-36, -52, 2, 2, p.danger)}${R(-38, -38, 2, 2, p.accent)}${blink(0.35, 0)}</g>`
  }
  return s
}

/** Mine cart on a rail stub; `fill` pieces static, the rest animate in while filling. */
function cart(p: Palette, seed: number, fill: number, filling: boolean, tipped: boolean, full: boolean): string {
  const ore = (i: number, x = 42 + i * 8, y = -31 - (i % 2) * 3) =>
    R(x, y, 9, 6, p.metal, ` stroke="${p.metalLight}" stroke-width="1"`) + T(x + 1, y + 5, GLYPHS[(seed + i) % GLYPHS.length]!.slice(0, 2), p.accent, 6)
  let pile = ''
  for (let i = 0; i < 3; i++) {
    if (i < fill) pile += ore(i)
    else if (filling) {
      pile += `<g opacity="0">${ore(i)}<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;${(0.15 + (i - fill) * 0.3).toFixed(2)};0.95;1" calcMode="discrete" dur="6s" ${IND}/></g>`
    }
  }
  if (full) pile += R(46, -37, 18, 9, p.metalDark) + T(48, -30, '{}', p.paper, 8)
  const body =
    pile +
    `<polygon points="36,-24 72,-24 68,-6 40,-6" fill="${p.metal}"/>` +
    P(p.metalDark, 46, -20, 16, 2, 46, -14, 16, 2) + P(p.ink, 40, -7, 7, 7, 61, -7, 7, 7) +
    P(p.metalLight, 35, -26, 38, 3, 42, -5, 3, 3, 63, -5, 3, 3) +
    (full ? T(47, -9, 'FULL', p.paper, 6) + T(41, -15, 'x3', p.paper, 6) + R(37, -30, 4, 4, p.metalLight) + R(69, -29, 4, 3, p.accent) + R(71, -22, 3, 3, p.metal) : '')
  const t = tipped ? ` transform="translate(-6,0) rotate(14 70 0)"` : ''
  return R(30, 0, 44, 2, p.metalLight) + P(p.floorLine, 34, 2, 3, 2, 66, 2, 3, 2) +
    `<g${t}>${body}</g>` +
    (tipped ? ore(0, 24, -6) + ore(1, 33, -4) + T(10, -1, '{', p.accent, 7) + T(17, -3, ';', p.accent, 7) : '')
}

/** Two-pronged pick head, vertical, centred at (x,y) (handle runs along x). */
const pickHeadV = (p: Palette, x: number, y: number) =>
  `<polygon points="${x + 5},${y - 15} ${x - 1},${y - 8} ${x - 3},${y} ${x - 1},${y + 8} ${x + 5},${y + 15} ${x + 2},${y + 7} ${x + 1},${y} ${x + 2},${y - 7}" fill="${p.metalLight}"${INK(p)}/>` +
  P(p.metal, x + 1, y - 8, 1, 16) + R(x - 1, y - 4, 7, 8, p.metalDark)
/** Same head, horizontal (handle hangs below), centred at (x,y). */
const pickHeadH = (p: Palette, x: number, y: number) =>
  `<polygon points="${x - 15},${y + 5} ${x - 8},${y - 1} ${x},${y - 3} ${x + 8},${y - 1} ${x + 15},${y + 5} ${x + 7},${y + 2} ${x},${y + 1} ${x - 7},${y + 2}" fill="${p.metalLight}"${INK(p)}/>` +
  P(p.metal, x - 8, y + 1, 16, 1) + R(x - 4, y - 2, 8, 7, p.metalDark)
/** Upright pick: head centred at (x,y), handle 26 long below it. */
const pickUp = (p: Palette, x: number, y: number) =>
  R(x - 2, y, 5, 26, p.accentAlt) + R(x - 2, y, 1, 26, p.ink, ' opacity="0.3"') + pickHeadH(p, x, y)

/** Pickaxe in the left nub's local frame, pointing left, pivot (-27,-24). */
function pickaxe(p: Palette, anim: string, broken = false): string {
  const handle = broken
    ? R(-40, -26, 13, 5, p.accentAlt) + P(p.paper, -42, -27, 2, 2, -42, -23, 2, 2)
    : R(-58, -26, 31, 5, p.accentAlt) + R(-58, -22, 31, 1, p.ink, ' opacity="0.3"')
  return `<g>${anim}${handle}${broken ? '' : pickHeadV(p, -60, -24)}</g>`
}

export function exploreWorker(w: WorkerView, p: Palette): string {
  const st = w.status
  const sd = w.seed
  const hue = -18 + ((sd % 13) - 6)
  const body = desat(tint(p.clawd, hue, -0.14), 0.3)
  const shade = desat(tint(p.clawdDark, hue, -0.12), 0.3)
  const ph = -((sd % 10) / 10)
  const working = st === 'working', failed = st === 'failed', done = st === 'done', idle = st === 'idle', waiting = st === 'waiting'
  const tgt = w.isTarget
  const gray = p.sceneFilter.indexOf('grayscale') >= 0
  const hatC = gray ? p.metalLight : p.sceneFilter ? p.accentAlt : p.accent

  // ---- headlamp beam (behind body, local frame), from the lamp at (0,-47) ----
  const m = sd % 2 ? 1 : -1
  const sweep = tgt ? '0;28;-6;0' : working ? '-6;8;-6' : waiting ? '-18;14;-18' : idle ? '4;-34;-34;4' : '-4;10;-4'
  const beamOp = idle
    ? `<animate attributeName="opacity" values="0.3;0.12;0.12;0.3" keyTimes="0;0.7;0.9;1" dur="6s" ${IND}/>`
    : failed ? `<animate attributeName="opacity" values="0.3;0;0.3;0.05;0.3" dur="0.9s" ${IND}/>` : ''
  const beamFlip = idle ? ' transform="translate(-3,11)"' : waiting && m > 0 ? ' transform="scale(-1,1)"' : ''
  const beam = !done
    ? `<g${beamFlip}><g opacity="${idle ? 0.12 : 0.16}"><animateTransform attributeName="transform" type="rotate" values="${sweep.split(';').map(v => v + ' 0 -47').join(';')}" dur="${tgt ? 0.5 : idle ? 6 : waiting ? 2.4 : 3.2}s" begin="${tgt ? 0 : ph}s" ${IND}/>` +
      `<polygon points="0,-47 -44,-66 -44,-28" fill="${p.accent}"/><polygon points="0,-47 -42,-56 -42,-38" fill="${p.paper}" opacity="0.5"/>` + beamOp + `</g></g>`
    : ''

  // ---- hard hat dome (local) ----
  const hatT = done ? ` transform="rotate(8 0 -44)"` : idle ? ` transform="translate(-3,11) rotate(-12 -8 -44)"` : ''
  const pc = [p.metalLight, p.danger, p.ok][sd % 3]!
  const patch = sd % 2 ? R(9, -49, 5, 4, pc) : R(-17, -49, 6, 3, pc)
  const lamp = done || idle ? p.metal : p.paper
  const bird = failed
    // dead canary on its back on the crown: feet up, X eye
    ? `<g transform="translate(5,-62) scale(1.35) translate(-5,57)"><g stroke="${p.ink}" stroke-width="2" paint-order="stroke">${R(-3, -59, 12, 6, p.accent)}${R(8, -60, 6, 6, p.accent)}</g>` +
      R(14, -58, 3, 2, p.danger) + P(p.ink, 0, -67, 2, 8, 5, -67, 2, 8, -2, -68, 4, 1, 4, -68, 4, 1) +
      `<path d="M9.5-58.5l3 3m0-3l-3 3" stroke="${p.ink}"/></g>`
    : ''
  const hat = `<g${hatT}>` + R(-22, -44, 44, 3, hatC) + R(-20, -50, 40, 6, hatC) + R(-17, -55, 34, 5, hatC) + R(-11, -58, 22, 3, hatC) +
    R(-1, -58, 2, 14, p.ink, ' opacity="0.2"') + R(-22, -42, 44, 1, p.ink, ' opacity="0.35"') + R(-13, -55, 6, 2, p.paper, ' opacity="0.45"') + patch +
    R(-5, -50, 10, 7, p.ink) + R(-4, -49, 8, 5, lamp) + bird + `</g>`

  // ---- tool / props (local) ----
  let tool = ''
  let over = ''
  if (working && tgt) {
    // whipped mid-swing: the pick flies out of his nub and drops
    tool = `<g><animateTransform attributeName="transform" type="translate" values="0,0;0,0;-4,24;-4,24" keyTimes="0;0.58;0.8;1" ${WHIP_SYNC}/>` +
      pickaxe(p, `<animateTransform attributeName="transform" type="rotate" values="50 -27 -24;50 -27 -24;130 -27 -24;140 -27 -24" keyTimes="0;0.58;0.8;1" ${WHIP_SYNC}/>`) + `</g>`
  } else if (working) {
    tool = pickaxe(p, `<animateTransform attributeName="transform" type="rotate" values="70 -27 -24;80 -27 -24;-8 -27 -24;70 -27 -24" keyTimes="0;0.5;0.66;1" dur="0.9s" begin="${ph}s" ${IND}/>`)
    over += `<g opacity="0">${R(24, -40, 3, 4, p.paper)}<animateTransform attributeName="transform" type="translate" values="0,0;6,10" dur="0.9s" begin="${ph}s" ${IND}/>${blink(0.9, ph, '1;0')}</g>` +
      `<g opacity="0">${R(-22, -42, 3, 4, p.paper)}<animateTransform attributeName="transform" type="translate" values="0,0;-5,9" dur="1.1s" begin="${(ph - 0.4).toFixed(1)}s" ${IND}/>${blink(1.1, ph - 0.4, '1;0')}</g>`
  } else if (waiting) {
    // squinting through the magnifier (eye picked by seed); pick propped, foot tapping
    over += `<g><animateTransform attributeName="transform" type="translate" values="0,0;${-2 * m},1;0,0" dur="2s" ${IND}/>` +
      R(m > 0 ? 25 : -29, -26, 4, 12, p.accentAlt) +
      `<circle cx="${12 * m}" cy="-28" r="9" fill="${p.paper}" fill-opacity="0.3" stroke="${p.metalLight}" stroke-width="3"/>` +
      R(12 * m - 5, -36, 10, 16, p.ink) + R(12 * m + (m > 0 ? 0 : -2), -33, 3, 3, '#fff') + `</g>` +
      `<g>${R(m > 0 ? -22 : 17, -10, 5, 6, shade)}<animateTransform attributeName="transform" type="translate" values="0,0;0,-4" calcMode="discrete" dur="0.5s" ${IND}/></g>`
  } else if (done) {
    over += R(28, -30, 9, 9, p.paper) + R(37, -28, 3, 5, p.paper) + R(29, -30, 7, 2, p.accentAlt) + T(29, -30, '{', p.accent, 7) +
      `<g>${P(p.smoke, 30, -38, 2, 3, 33, -42, 2, 3)}${blink(2.4, ph, '0;0.7;0')}</g>`
  } else if (failed) {
    tool = pickaxe(p, '', true)
  }

  let eyes: ClawdEyes = idle ? 'tired' : done ? 'happy' : failed ? 'dead' : 'normal'
  if (tgt && !failed) eyes = 'wide'

  // ---- the miner ----
  const welt = tgt ? `<path d="M-8-26l14 11" stroke="${p.danger}" stroke-width="2.5"/>` + P(p.danger, 8, -15, 2, 2, -11, -28, 2, 2) : ''
  const char = clawd({
    x: CX, y: done ? -12 : 0, scale: S, body, shade, eyes, ink: p.ink,
    bob: working && !tgt ? 0.45 : 0,
    behind: beam + tool,
    over: over + hat + welt,
  })
  let charG = char
  if (idle) charG = `<g transform="translate(${CX},0) scale(1.05,0.9) translate(${-CX},0)">${char}</g>`
  if (failed) charG = `<g transform="rotate(-8 ${CX} 0)">${char}</g>`
  if (tgt) charG = flinch(charG)

  // ---- scene props (slot frame) ----
  let props = ''
  let lean = waiting ? `<g transform="rotate(16 -36 0)">${pickUp(p, -36, -26)}</g>` : ''
  if (idle || done) props += `<g transform="rotate(-24 -30 0)">${pickUp(p, -30, -26)}</g>`
  if (done) {
    props += R(CX - 22, -14, 44, 14, p.accentAlt) + R(CX - 22, -14, 44, 2, p.accent) + R(CX - 22, -8, 44, 1, p.ink) + R(CX - 2, -14, 2, 14, p.ink, ' opacity="0.4"') +
      // hand-painted plank stuck in the ore pile
      R(62, -52, 3, 20, p.accentAlt) + `<g transform="rotate(-6 58 -60)">${R(42, -70, 32, 19, p.paper)}${R(42, -52, 32, 1, p.ink, ' opacity="0.4"')}` +
      T(46, -62, 'OFF', p.ink, 8) + T(45, -54, 'SHIFT', p.ink, 7) + `</g>`
  }

  // flying ore chips + strike sparks while working
  const chips = working && !tgt
    ? `<path d="M-44-39l-5 5 3 5-6 6 2 6-5 4" fill="none" stroke="${p.ink}" stroke-dasharray="30">` +
      `<animate attributeName="stroke-dashoffset" values="30;21;12;0" calcMode="discrete" dur="7.2s" begin="${(ph - (sd % 4) * 1.8).toFixed(1)}s" ${IND}/></path>` +
      [0, 1].map(i => `<g opacity="0">${R(-1, -1, 4, 4, i ? p.accent : p.metalLight)}` +
        `<animateMotion path="M-40,-34 Q${8 + i * 6},${-120 + i * 10} ${50 + i * 8},-26" dur="0.9s" begin="${(ph + 0.6 + i * 0.05).toFixed(2)}s" ${IND}/>` +
        `<animate attributeName="opacity" values="1;1;0" keyTimes="0;0.85;1" dur="0.9s" begin="${(ph + 0.6 + i * 0.05).toFixed(2)}s" ${IND}/></g>`).join('') +
      `<g opacity="0">${R(-48, -44, 9, 9, '#fff')}${P(p.accent, -40, -30, 2, 2, -47, -28, 2, 2)}` +
      `<animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.6;0.66;0.8;1" dur="0.9s" begin="${ph}s" ${IND}/></g>` +
      `<g opacity="0">${T(-34, -66, 'TINK!', p.paper, 8, OUT(p, 2.5))}<animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.6;0.7;1" dur="1.8s" begin="${ph}s" ${IND}/></g>`
    : ''

  // ---- status flourishes ----
  let fx = ''
  if (waiting) {
    fx += `<g>${T(CX + (sd % 2 ? 20 : -28), -74, '?', p.paper, 16, OUT(p))}<animateTransform attributeName="transform" type="translate" values="0,0;0,-4;0,0" dur="1.2s" ${IND}/></g>`
  }
  if (idle) {
    fx += [0, 1, 2].map(i => `<g opacity="0">${T(CX + 14 + i * 7, -62 - i * 9, 'z', p.paper, 9 + i * 3)}` +
      `<animateTransform attributeName="transform" type="translate" values="0,4;4,-6" dur="2.4s" begin="${-i * 0.8}s" ${IND}/>${blink(2.4, -i * 0.8)}</g>`).join('')
  }
  if (failed) {
    fx += `<g>${T(CX - 48, -96, 'CAVE-IN!', p.danger, 9, OUT(p))}${blink(0.8, 0, '1;0.3;1')}</g>` +
      `<polygon points="-44,4 -40,-2 -28,-2 -24,4" fill="${p.metalLight}"/>` + R(-30, 0, 9, 3, p.accentAlt) +
      // rubble sliding onto the feet
      `<g>${P(p.metal, -32, -5, 8, 6, -22, -3, 6, 4, -14, -4, 5, 5)}${P(p.metalLight, -26, -9, 6, 5, -17, -7, 4, 4)}` +
      `<animateTransform attributeName="transform" type="translate" values="-8,-3;0,0;0,0" keyTimes="0;0.3;1" dur="2.4s" ${IND}/></g>`
  }
  if (tgt) {
    fx += ow(CX + 26, -90, p) +
      `<g opacity="0">${P(p.paper, CX - 34, -60, 3, 5, CX + 34, -64, 3, 5, CX + 40, -48, 3, 4)}` +
      `<animateTransform attributeName="transform" type="translate" values="0,0;0,0;0,-8" keyTimes="0;0.6;1" ${WHIP_SYNC}/><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.6;0.62;1" ${WHIP_SYNC}/></g>`
  }

  const fill = done ? 3 : working ? 1 + (sd % 2) : idle || waiting ? 1 + (sd % 2) : 0
  return `<g transform="translate(${w.x},${w.y})" shape-rendering="crispEdges" font-family="monospace" font-size="8" font-weight="bold">` +
    rock(p, sd, failed) + cart(p, sd, fill, working, failed, done) +
    props + charG + lean + chips + fx + `</g>`
}
