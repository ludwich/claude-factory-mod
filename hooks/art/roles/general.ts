import type { Palette, WorkerView } from '../types.ts'
import { clawd, flinch, ow, tint, WORKER_SCALE } from '../clawd.ts'

// General-purpose: the line smith. Flat cap, leather apron, a big hammer
// pounding hot widgets on an anvil, a crate of finished widgets stacking up.

// pixel block as a compact path (the size budget is tight)
const r = (x: number, y: number, w: number, h: number, f: string, extra = '') =>
  `<path d="M${x} ${y}h${w}v${h}h${-w}z" fill="${f}"${extra}/>`

const IND = 'repeatCount="indefinite"'

/** A finished widget: a stubby hex nut. */
function nut(x: number, y: number, c: string, d: string): string {
  return `<path d="M${x - 4} ${y - 6}h8v1h1v4h-1v1h-8v-1h-1v-4h1z" fill="${c}"/>` + r(x - 1, y - 4, 2, 2, d)
}

/** HSL lightness of a #rrggbb colour. */
function light(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (Math.max(...c) + Math.min(...c)) / 510
}

function crate(x: number, y: number, wd: number, h: number, p: Palette, n: number, ding = ''): string {
  // dull the crate down to a fixed lightness so the widgets on it pop in every theme
  const dl = 0.26 - light(p.accentAlt)
  const wood = tint(p.accentAlt, 0, dl)
  const dark = tint(p.accentAlt, 0, dl - 0.12)
  let s = r(x, y, wd, h, wood) + r(x, y, wd, 2, dark) + r(x, y + h - 2, wd, 2, dark) +
    r(x, y, 2, h, dark) + r(x + wd - 2, y, 2, h, dark) +
    r(x + 2, y + Math.round(h / 2), wd - 4, 1, dark) +
    // stencilled nut on the face
    nut(x + wd / 2, y + Math.round(h / 2) - 2, dark, wood)
  // finished widgets stacked on the lid, a little pyramid
  const rows = [3, 2, 1]
  let k = 0
  let pile = ''
  for (let row = 0; row < rows.length && k < n; row++) {
    for (let i = 0; i < rows[row]! && k < n; i++, k++) {
      const cx = x + wd / 2 + (i - (rows[row]! - 1) / 2) * 9
      pile += nut(cx, y - row * 6, p.metalLight, p.metalDark)
    }
  }
  const ax = x + wd / 2
  return s + (ding ? `<g transform="translate(${ax},${y})"><g>${ding}<g transform="translate(${-ax},${-y})">${pile}</g></g></g>` : pile)
}

function anvil(p: Palette, cracked: boolean, shake = ''): string {
  const hi = tint(p.metalLight, 0, 0.04)
  const face = tint(p.metalLight, 0, -0.08)
  return (
    `<g>${shake}` +
    r(23, -34, 5, 5, p.metalDark) +
    `<polygon points="62,-34 75,-34 62,-28" fill="${face}"/>` +
    r(28, -34, 34, 7, face) + r(28, -34, 47, 2, hi) + r(28, -28, 34, 1, p.metalDark) +
    r(37, -27, 16, 12, p.metal) + r(39, -27, 2, 12, p.metalLight) + r(31, -15, 28, 7, p.metalLight) +
    r(28, -8, 34, 8, p.metal) + r(28, -8, 34, 2, hi) +
    (cracked ? `<path d="M40,-34 l3,7 l-3,4 l4,7 l-2,6" stroke="${p.ink}" stroke-width="1.5" fill="none"/>` : '') +
    `</g>`
  )
}

/** Hammer drawn pointing up from its grip at (0,0); striking face on the +x end. */
function hammer(p: Palette, broken = false): string {
  const wood = tint(p.accentAlt, 0, -0.15)
  if (broken) return r(-1.5, -12, 3, 14, wood) + `<polygon points="-1.5,-12 0,-16 1.5,-12" fill="${wood}"/>`
  return r(-1.5, -22, 3, 24, wood) + r(-9, -32, 18, 12, p.ink) + r(-8, -31, 16, 10, p.metalLight) + r(-8, -31, 16, 2, '#fff', ' opacity="0.35"') + r(-8, -23, 16, 2, p.metalDark) + r(6, -31, 2, 10, p.metalDark)
}

function drops(p: Palette, x: number, y: number, ph: number, wide: boolean): string {
  const sweat = tint(p.accent, 160, 0.15)
  const list = wide ? [[-22, -14], [24, -16], [-30, -2]] : [[-4, 14], [6, 18]]
  const dur = wide ? 0.5 : 1.2
  return list.map(([dx, dy], i) =>
    `<g><animateTransform attributeName="transform" type="translate" values="0,0;${dx},${dy}" dur="${dur}s" begin="-${(ph + i * 0.3).toFixed(1)}s" ${IND}/>` +
    `<animate attributeName="opacity" values="1;0" dur="${dur}s" begin="-${(ph + i * 0.3).toFixed(1)}s" ${IND}/>` +
    r(x + (i % 2 ? 4 : -4), y, 3, 4, sweat) + r(x + (i % 2 ? 5 : -3), y - 2, 1, 2, sweat) + `</g>`
  ).join('')
}

export function generalWorker(w: WorkerView, p: Palette): string {
  const sd = w.seed
  const hue = 7 + (sd % 7) - 3
  const body = tint(p.clawd, hue, 0.015)
  const shade = tint(p.clawdDark, hue, 0.01)
  const ph = (sd % 9) / 10
  const st = w.status
  const tgt = w.isTarget
  const S = WORKER_SCALE

  // costume, drawn in Clawd's local frame
  const cap = sd % 2 ? tint(p.clawdDark, -8, -0.22) : tint(p.metalDark, 0, 0.06 + (sd % 3) * 0.03)
  const capHi = tint(cap, 0, 0.12)
  const brim = tint(cap, 0, -0.1)
  // newsboy cap: puffy stepped crown, separate dark brim jutting forward, highlight, button
  const capSvg =
    r(-24, -45, 47, 6, cap) + r(-20, -48, 39, 3, cap) + r(-14, -50, 27, 2, cap) +
    r(-18, -48, 30, 1, capHi) + r(-12, -50, 18, 1, capHi) + r(-24, -40, 47, 1, brim) +
    r(12, -41, 22, 4, brim) + r(12, -41, 22, 1, capHi) + r(-2, -52, 4, 2, capHi) +
    r(12, -37, 20, 1, p.ink, ' opacity="0.35"')
  const leather = tint(p.clawdDark, 0, -0.2)
  const costume =
    // leather apron: straps outboard of the eyes, bib low over the legs, off-centre pocket
    r(-21, -40, 2, 25, leather) + r(19, -40, 2, 25, leather) +
    r(-16, -17, 32, 13, leather) + r(-16, -17, 32, 1, tint(leather, 0, 0.1)) +
    r(6, -13, 8, 5, tint(leather, 0, -0.07)) + r(6, -13, 8, 1, tint(leather, 0, 0.1)) +
    (sd % 3 === 0 ? r(-12, -14, 5, 5, p.accent) + r(-11, -13, 3, 1, p.ink, ' opacity="0.5"') : '') +
    (sd % 4 === 1 ? r(24, -28, 6, 2, p.paper) + r(-30, -28, 6, 2, p.paper) : '') +
    // soot: 1-3 smudges picked by seed, plus a seeded tear in the apron hem
    [[-18, -20, 6, 4], [4 + (sd % 7) * 2, -37, 5, 2], [16, -21 + (sd % 4), 3, 3], [-6, -36, 4, 2]]
      .filter((_, i) => (sd >> i) % 2 === 1 || i === sd % 4)
      .map(([x = 0, y = 0, ww = 0, hh = 0]) => r(x, y, ww, hh, p.ink, ' opacity="0.45"')).join('') +
    (sd % 5 < 3 ? `<polygon points="${-12 + (sd % 5) * 9},-4 ${-9 + (sd % 5) * 9},-8 ${-6 + (sd % 5) * 9},-4" fill="${body}"/>` : '') +
    (tgt ? r(-23, -33, 7, 1.5, p.danger) + r(-23, -27.5, 7, 1.5, p.danger) + r(-23, -33, 1.5, 7, p.danger) + r(-17.5, -33, 1.5, 7, p.danger) +
      r(-21, -31, 3, 3, p.danger, ' opacity="0.5"') : '')
  const fallen = st === 'failed'
  const dress = (fallen ? `<g transform="translate(6,-1) rotate(14 0 -45)">${capSvg}</g>` : capSvg) + costume

  const eyes = st === 'failed' ? 'dead' : tgt ? 'wide' : st === 'done' ? 'happy' : st === 'idle' ? 'tired' : 'normal'
  const cx = -9
  const grip = 'translate(22,-30)'
  const hand = r(19, -33, 7, 7, body) + (sd % 3 === 1 ? r(19, -31, 7, 2, p.paper) : '')
  const stock = Math.min(6, 1 + Math.floor(w.tools / 3))
  let ch = ''   // character + hand-held props (moves with the flinch)
  let set = ''  // workstation and scene props
  let fx = ''   // floating text / particles

  const leanHammer = `<g transform="translate(21,-1) rotate(16)">${hammer(p)}</g>`

  if (st === 'working') {
    const dur = 0.9
    const kt = '0;0.25;0.35;1'
    set = anvil(p, false) +
      // the glowing hot widget, squashed on every strike
      `<g transform="translate(47,-34)"><g><animateTransform attributeName="transform" type="scale" values="1,1;1.15,0.6;1,1;1,1" keyTimes="${kt}" dur="${dur}s" begin="-${ph}s" ${IND}/>` +
      `${r(-6, -5, 12, 5, p.accentAlt)}${r(-4, -4, 8, 2, p.accent)}` +
      `</g></g>` +
      crate(-75, -22, 24, 22, p, stock,
        `<animateTransform attributeName="transform" type="scale" values="1,1;1,1;1.1,0.8;1,1.08;1,1" keyTimes="0;0.42;0.45;0.5;1" dur="${dur * 3}s" begin="-${ph}s" ${IND}/>`) +
      // every third swing a finished nut pops over onto the crate
      `<g opacity="0"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.09;0.1;0.42;0.45" dur="${dur * 3}s" begin="-${ph}s" ${IND}/>` +
      `<animateMotion path="M0,0 Q-55,-90 -110,2" keyPoints="0;0;1;1" keyTimes="0;0.1;0.42;1" calcMode="linear" dur="${dur * 3}s" begin="-${ph}s" ${IND}/>` +
      // fresh off the anvil it glows hot, then cools in flight
      `<g>${r(41, -46, 12, 8, p.accent)}<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.14;0.24;1" dur="${dur * 3}s" begin="-${ph}s" ${IND}/></g>` +
      nut(47, -39, p.metalLight, p.metalDark) + `</g>`
    ch = clawd({ x: cx, scale: S, body, shade, eyes, over: dress }) +
      `<g transform="${grip}"><g><animateTransform attributeName="transform" type="rotate" values="-45;57;57;-45" keyTimes="${kt}" dur="${dur}s" begin="-${ph}s" ${IND}/>${hammer(p)}</g></g>` + hand +
      drops(p, -44, -52, ph, false)
    const kts = '0;0.25;0.6;1'
    const sp: Array<[number, number, string]> = [[-10, -14, p.accent], [12, -18, p.accentAlt], [4, -24, '#fff'], [18, -8, p.accent]]
    const b = `dur="${dur}s" begin="-${ph}s" keyTimes="${kts}" ${IND}`
    const word = ['CLANG', 'CLONK', 'TINK!'][sd % 3]
    // two sparks that hit the floor and bounce
    const bounce = ([dx, dy, ex, ey, c]: [number, number, number, number, string]) =>
      `<g><animateTransform attributeName="transform" type="translate" values="0,0;0,0;${dx},${dy};${ex},${ey}" keyTimes="0;0.25;0.55;1" dur="${dur}s" begin="-${ph}s" ${IND}/>${r(46, -39, 2, 2, c)}</g>`
    fx = `<g opacity="0"><animate attributeName="opacity" values="0;1;0;0" ${b}/>` +
      // one burst: sparks sit at their end offsets and the group scales out from the strike point
      `<g transform="translate(45,-40)"><g><animateTransform attributeName="transform" type="scale" values="0.2;0.2;1;1.15" ${b}/>` +
      sp.map(([dx, dy, c]) => r(dx - 1, dy - 1, 3, 3, c)).join('') + `</g></g>` +
      `<text x="61" y="-64" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="${p.accent}" stroke="${p.ink}" stroke-width="0.4">${word}</text></g>` +
      `<g opacity="0"><animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.25;0.26;0.9;1" dur="${dur}s" begin="-${ph}s" ${IND}/>` +
      ([[16, 36, 24, 30, p.accent], [-12, 36, -20, 32, '#fff']] as Array<[number, number, number, number, string]>).map(bounce).join('') + `</g>`
  } else if (st === 'waiting') {
    set = anvil(p, false) + crate(-75, -22, 24, 22, p, stock) + leanHammer
    // pocket watch held up in the left hand, chain looping back to the apron
    const watch = `<path d="M-50,-37 q2,12 18,14" stroke="${p.accent}" stroke-width="1" fill="none"/>` +
      r(-56, -48, 12, 12, p.accent) + r(-55, -47, 10, 10, p.paper) + r(-51, -50, 2, 2, p.accent) +
      r(-50.5, -46, 1, 5, p.ink) + r(-50.5, -42, 4, 1, p.ink) +
      r(-52, -38, 7, 6, body)
    const legX = cx + 17 * S
    const legW = 5 * S
    const tapClip = `gw-tap-${sd}-${w.id.replace(/[^A-Za-z0-9_-]/g, '')}`
    ch = `<clipPath id="${tapClip}"><rect x="-80" y="-130" width="${80 + legX}" height="140"/><rect x="${legX}" y="-130" width="${legW}" height="120"/><rect x="${legX + legW}" y="-130" width="80" height="140"/></clipPath>` +
      `<g clip-path="url(#${tapClip})">` + clawd({ x: cx, scale: S, body, shade, eyes, over: dress }) + `</g>` +
      `<g><animateTransform attributeName="transform" type="translate" values="0,0;0,-3;0,0" dur="0.3s" begin="-${ph}s" ${IND}/>${r(legX, -10, legW, 10, shade)}</g>` +
      watch + r(19, -33, 7, 7, body)
    fx = `<g><animateTransform attributeName="transform" type="translate" values="0,0;0,-4;0,0" dur="1.2s" begin="-${ph}s" ${IND}/>` +
      `<text x="-12" y="-72" text-anchor="middle" font-family="monospace" font-size="18" font-weight="bold" fill="${p.paper}" stroke="${p.ink}" stroke-width="0.8">?</text></g>` +
      `<g><animate attributeName="opacity" values="1;0;1" dur="0.6s" begin="-${ph}s" ${IND}/>` +
      `<text x="30" y="-40" font-family="monospace" font-size="8" font-weight="bold" fill="${p.paper}" stroke="${p.ink}" stroke-width="0.4">tap tap</text></g>`
  } else if (st === 'idle') {
    set = anvil(p, false) + crate(-75, -22, 24, 22, p, stock - 1) + leanHammer
    const capDown = `<g transform="translate(0,9)">${capSvg}</g>` + costume
    ch = `<g transform="translate(${cx},0) skewX(-16) scale(1,0.8) translate(${-cx},0)">` +
      clawd({ x: cx, scale: S, body, shade, eyes: 'closed', over: capDown, bob: 3 }) + `</g>`
    fx = ['z', 'z', 'Z'].map((z, i) =>
      `<g opacity="0"><animate attributeName="opacity" values="0;1;0" dur="3s" begin="-${ph + i}s" ${IND}/>` +
      `<animateTransform attributeName="transform" type="translate" values="0,0;${8 + i * 2},-26" dur="3s" begin="-${ph + i}s" ${IND}/>` +
      `<text x="0" y="-66" font-family="monospace" font-size="${9 + i * 3}" font-weight="bold" fill="${p.paper}" stroke="${p.ink}" stroke-width="0.5">${z}</text></g>`
    ).join('')
  } else if (st === 'done') {
    // clocked out: sat on the crate, cuppa in hand, hammer leaned on the anvil
    const board = tint(p.metalDark, 0, -0.04)
    set = anvil(p, false) + leanHammer +
      // CLOCKED OUT tag hung from the anvil horn
      `<path d="M70,-33 L44,-25 M70,-33 L70,-25" stroke="${p.paper}" stroke-width="1"/>` +
      `<g transform="rotate(-4 56 -16)">${r(38, -26, 36, 19, tint(p.accentAlt, 0, -0.2))}${r(39, -25, 34, 17, board)}` +
      `<text x="56" y="-18" text-anchor="middle" font-family="monospace" font-size="7" font-weight="bold" fill="${p.ok}">CLOCKED</text>` +
      `<text x="56" y="-10" text-anchor="middle" font-family="monospace" font-size="7" font-weight="bold" fill="${p.paper}">OUT</text></g>` +
      [[6, 0], [15, 0], [10.5, -6]].map(([x = 0, y = 0]) => nut(x, y, p.metalLight, p.metalDark)).join('') +
      crate(-73, -21, 70, 21, p, 0)
    // saucer + cup held in the right hand nub, steam curling up
    const cup = r(-6, -45, 15, 2, p.paper) + r(-4, -53, 11, 8, p.paper) + r(7, -51, 3, 4, p.paper) + r(8, -50, 1, 2, tint(p.paper, 0, -0.3)) +
      r(-3, -52, 9, 2, tint(p.accentAlt, 0, -0.2)) + r(-4, -46, 11, 1, tint(p.paper, 0, -0.25)) +
      r(-8, -47, 7, 7, body)
    ch = clawd({ x: -37, y: -11, scale: S, body, shade, eyes, over: dress }) + cup
    fx = [0, 1].map(i =>
      `<g opacity="0"><animate attributeName="opacity" values="0;0.8;0" dur="2.4s" begin="-${(ph + i * 1.2).toFixed(1)}s" ${IND}/>` +
      `<animateTransform attributeName="transform" type="translate" values="0,0;${i ? 3 : -3},-14" dur="2.4s" begin="-${(ph + i * 1.2).toFixed(1)}s" ${IND}/>` +
      r(-1 + i * 4, -59, 2, 4, p.smoke) + r(i * 4, -62, 2, 2, p.smoke) + `</g>`
    ).join('')
  } else {
    // failed: cracked anvil, snapped hammer head embedded in the floor, smoke and sparks
    set = anvil(p, true) +
      `<g transform="translate(14,-1) rotate(-25)">${r(-7, -9, 14, 9, p.metalLight)}${r(-7, -2, 14, 2, p.metalDark)}</g>` +
      `<path d="M8,0 l-4,3 M14,0 l1,4 M20,0 l4,3" stroke="${p.ink}" stroke-width="1.2"/>` +
      `<text x="20" y="-14" font-family="monospace" font-size="7" font-weight="bold" fill="${p.paper}" stroke="${p.ink}" stroke-width="0.4">thud</text>` +
      crate(-75, -22, 24, 22, p, Math.min(3, stock))
    ch = `<g transform="rotate(-9 -12 0)">` + clawd({ x: cx, scale: S, body, shade, eyes, over: dress }) +
      `<g transform="${grip} rotate(30)">${hammer(p, true)}</g>${hand}` +
      // squashed thumb, throbbing
      `<g>${r(24, -37, 7, 7, p.danger)}${r(25, -36, 2, 2, '#fff', ' opacity="0.5"')}` +
      `<animateTransform attributeName="transform" type="translate" values="0,0;-1,-1;0,0" dur="0.5s" ${IND}/>` +
      `<animate attributeName="opacity" values="1;0.75;1" dur="0.5s" ${IND}/></g></g>`
    const sparks: Array<[number, number, string]> = [[32, -38, '#fff'], [58, -36, p.accent], [46, -14, '#fff']]
    fx = [0, 1, 2].map(i =>
      `<g opacity="0"><animate attributeName="opacity" values="0;0.85;0" dur="2.4s" begin="-${(ph + i * 0.8).toFixed(1)}s" ${IND}/>` +
      `<animateTransform attributeName="transform" type="translate" values="0,0;${4 - i * 3},-40" dur="2.4s" begin="-${(ph + i * 0.8).toFixed(1)}s" ${IND}/>` +
      r(40, -44, 10, 8, p.smoke) + r(38, -42, 14, 4, p.smoke) + r(43, -47, 5, 3, p.smoke) + `</g>`
    ).join('') +
      sparks.map(([x, y, c], i) =>
        `<g><animate attributeName="opacity" values="1;0;0;1" dur="${0.5 + i * 0.2}s" begin="-${ph}s" ${IND}/>` +
        r(x, y, 3, 3, c) + r(x + 4, y - 4, 3, 3, c) + `</g>`
      ).join('')
  }

  if (tgt) {
    ch = flinch(ch + drops(p, cx, -60, 0, true), -12)
    fx += ow(22, -88, p) +
      `<path d="M-58,-46 l-6,-2 M-58,-34 l-8,0 M28,-58 l6,-4" stroke="${p.paper}" stroke-width="1.5"/>`
  }

  return `<g transform="translate(${w.x},${w.y})" shape-rendering="crispEdges">${set}${ch}${fx}</g>`
}
