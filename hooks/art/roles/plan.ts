import type { Palette, WorkerView } from '../types.ts'
import type { ClawdEyes } from '../clawd.ts'
import { clawd, flinch as whipFlinch, ow as owText, tint, WHIP_SYNC, WORKER_SCALE } from '../clawd.ts'

// The Plan worker: a Victorian draftsman Clawd at a drafting table, round
// spectacles, pencil tucked behind the "ear", compass in hand scribing circles
// onto a blueprint while rolled plans pile up in a bin under the table.

const R = 'repeatCount="indefinite"'
const r = (x: number, y: number, w: number, h: number, f: string, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${extra}/>`

const CX = -20 // character feet-centre x (local)
const S = WORKER_SCALE // character scale

type Ctx = { p: Palette; body: string; shade: string; blue: string; blueDk: string; drop: string; ph: number; seed: number }

/** Drafting table: legs, crossbar, ledge, board frame. */
function table(c: Ctx): string {
  const { p } = c
  return (
    r(14, -42, 4, 42, p.metalDark) + r(64, -42, 4, 42, p.metalDark) +
    r(14, -16, 54, 3, p.metalDark) +
    r(8, -88, 66, 44, p.metal) + r(8, -88, 66, 2, p.metalLight) +
    r(6, -45, 70, 4, p.metalLight) + r(6, -42, 70, 1, p.metalDark)
  )
}

/** Bin of rolled blueprints under the table. */
function bin(c: Ctx): string {
  const { p, blue, blueDk } = c
  let rolls = ''
  const xs = [29, 35, 41, 47]
  xs.forEach((x, i) => {
    const h = 12 + ((c.seed + i * 3) % 4) * 2
    rolls += r(x, -18 - h, 5, h + 4, i % 2 ? blueDk : blue) + r(x, -18 - h, 5, 2, '#fff', ' opacity=".8"')
  })
  return rolls + r(26, -18, 30, 18, p.accentAlt) + r(26, -18, 30, 2, p.metalLight) +
    r(26, -10, 30, 1, p.metalDark) + r(26, -4, 30, 1, p.metalDark)
}

/** The blueprint sheet with grid and a box-and-arrow diagram. */
function blueprint(c: Ctx, full: boolean, diagram = true): string {
  const { blue } = c
  let grid = ''
  for (let x = 17; x < 71; x += 6) grid += `M${x},-85v38`
  for (let y = -79; y < -47; y += 6) grid += `M11,${y}h60`
  const flipped = c.seed % 2 === 1
  const ax = flipped ? 52 : 15, bx = flipped ? 15 : 52
  const W = '#fff'
  const box = (x: number, y: number) => `<rect x="${x + 0.5}" y="${y + 0.5}" width="13" height="8" fill="none" stroke="${W}" stroke-width="1.2"/>`
  const arrowR = flipped
    ? `<path d="M51,-77.5H30" stroke="${W}" stroke-width="1.2"/><polygon points="29,-77.5 33,-80 33,-75" fill="${W}"/>`
    : `<path d="M29,-77.5H50" stroke="${W}" stroke-width="1.2"/><polygon points="52,-77.5 48,-80 48,-75" fill="${W}"/>`
  let d = r(11, -85, 60, 38, blue) +
    `<path d="${grid}" stroke="${W}" stroke-width=".5" opacity=".28"/>`
  if (!diagram) return d
  d += box(ax, -82) + box(bx, -82) + arrowR +
    `<path d="M29,-80.5H50M29,-74.5H50" stroke="${W}" stroke-width=".8" opacity=".6"/>`
  if (full) {
    d += `<path d="M58.5,-73V-66" stroke="${W}" stroke-width="1.2"/><polygon points="58.5,-64 56,-68 61,-68" fill="${W}"/>` +
      box(52, -63) +
      `<circle cx="27" cy="-58" r="6" fill="none" stroke="${W}" stroke-width="1.2"/>` +
      r(14, -70, 9, 1, W, ' opacity=".7"') + r(14, -67, 6, 1, W, ' opacity=".7"')
  }
  return d
}

/** T-square lying along the bottom of the board. */
function tsquare(c: Ctx): string {
  return r(13, -51, 54, 2, c.p.paper) + r(67, -55, 4, 12, c.p.paper) + r(67, -55, 4, 1, c.p.metalLight)
}

/** Glasses + pencil behind the ear + optional patch, in the sprite's local frame. */
function face(c: Ctx, cracked: boolean, pencil = true, slip = false): string {
  const { p } = c
  const lens = (cx: number, cy = -27) =>
    `<circle cx="${cx}" cy="${cy}" r="7.5" fill="#fff" fill-opacity=".1" stroke="${p.ink}" stroke-width="1.6"/>`
  let s = slip
    // slid down the nose, tilted, right lens hanging off by the bridge
    ? `<g transform="translate(0,5) rotate(6 0 -27)">` + lens(-11.5) + r(-24, -29, 5, 1.4, p.ink) + r(-4, -28, 6, 1.6, p.ink) +
      `<g transform="rotate(55 2 -27)">${lens(11.5)}</g></g>`
    : lens(-11.5) + lens(11.5) + r(-4, -28, 8, 1.6, p.ink) +
      r(-24, -29, 5, 1.4, p.ink) + r(19, -29, 5, 1.4, p.ink)
  if (cracked) s += `<path d="M7,-33l4,5l-2,3l4,4" stroke="#fff" stroke-width="1" fill="none"/>`
  if (pencil) {
    s += r(18, -43, 6, 3, c.shade) + `<g transform="rotate(-35 22 -42)">` + r(14, -44, 16, 4, p.accent) + r(14, -44, 16, 1, p.metalLight) +
      r(30, -44, 3, 4, p.danger) + `<polygon points="14,-44 10,-42 14,-40" fill="${p.paper}"/>` +
      r(10, -42.5, 1.5, 1, p.ink) + `</g>`
  }
  if (c.seed % 3 === 0) {
    s += r(-20, -16, 7, 6, c.shade) + `<path d="M-19.5,-15.5h6M-19.5,-10.5h6" stroke="${p.paper}" stroke-width=".6" stroke-dasharray="1 1"/>`
  }
  return s
}

const sweat = (c: Ctx, x: number, y: number, dur: number, dx = -1) =>
  `<g opacity="0"><polygon points="${x},${y} ${x - 2},${y + 4} ${x + 2},${y + 4}" fill="${c.drop}"/>${r(x - 2, y + 4, 4, 2, c.drop)}` +
  `<animate attributeName="opacity" values="0;1;1;0" dur="${dur}s" begin="-${(c.ph * dur).toFixed(2)}s" ${R}/>` +
  `<animateTransform attributeName="transform" type="translate" values="0,0;${dx * 4},3;${dx * 10},14" dur="${dur}s" begin="-${(c.ph * dur).toFixed(2)}s" ${R}/></g>`

function person(c: Ctx, eyes: ClawdEyes, opts: { y?: number; bob?: number; over?: string; cracked?: boolean; pencil?: boolean; slip?: boolean }): string {
  return clawd({
    x: CX, y: opts.y ?? 0, scale: S, body: c.body, shade: c.shade, eyes, ink: c.p.ink, bob: opts.bob,
    over: face(c, !!opts.cracked, opts.pencil ?? true, !!opts.slip) + (opts.over ?? ''),
  })
}

/** A pair of compasses, pin at local (0,0), hinge up top; legs in ink, bright hinge. */
function compassSvg(c: Ctx): string {
  const { p } = c
  return `<path d="M0,0L6,-14L12,0" stroke="${p.ink}" stroke-width="2" fill="none"/>` +
    r(4.5, -18, 3, 4, p.accent) + r(5, -15.5, 2, 2, '#fff') + r(11, -1, 2, 2, p.danger)
}

const PX = 30, PY = -55 // compass pin on the blueprint
const SH = { x: CX + 38, y: -38 } // shoulder (lower outer corner of the right nub) on the stool

function stool(c: Ctx): string {
  const { p } = c
  return r(CX - 20, -14, 40, 4, p.accentAlt) + r(CX - 20, -14, 40, 1, p.metalLight) +
    `<polygon points="${CX - 16},-10 ${CX - 12},-10 ${CX - 18},0 ${CX - 22},0" fill="${p.metalLight}"/>` +
    `<polygon points="${CX + 12},-10 ${CX + 16},-10 ${CX + 22},0 ${CX + 18},0" fill="${p.metalLight}"/>` +
    r(CX - 17, -5, 34, 2, p.metalLight)
}

function clawdLocal(c: Ctx, eyes: ClawdEyes, y: number, bob?: number): string {
  return clawd({
    x: CX, y, scale: S, body: c.body, shade: c.shade, eyes, ink: c.p.ink, bob,
    over: face(c, false, false),
  })
}

function working(c: Ctx, eyes: ClawdEyes): string {
  const { p } = c
  const d = 1.6
  const b = `begin="-${(c.ph * d).toFixed(2)}s"`
  // sweep -50deg -> +15deg -> back; hand follows the handle exactly
  const angs = [-50, -34, -18, -2, 15, -2, -18, -34, -50]
  const kt = angs.map((_, i) => (i / (angs.length - 1)).toFixed(3)).join(';')
  const hx = 6, hy = -16
  const pts = angs.map(a => {
    const t = a * Math.PI / 180
    return [PX + hx * Math.cos(t) - hy * Math.sin(t), PY + hx * Math.sin(t) + hy * Math.cos(t)]
  })
  const vals = (k: number, off = 0) => pts.map(q => (q[k]! + off).toFixed(1)).join(';')
  const anim = (attr: string, v: string) => `<animate attributeName="${attr}" values="${v}" keyTimes="${kt}" dur="${d}s" ${b} ${R}/>`
  const compass = `<g transform="translate(${PX},${PY})"><g>` +
    `<animateTransform attributeName="transform" type="rotate" values="${angs.join(';')}" keyTimes="${kt}" dur="${d}s" ${b} ${R}/>` +
    compassSvg(c) + `</g></g>`
  // the arc being scribed (radius 12 around the pin)
  const a0 = -50 * Math.PI / 180, a1 = 15 * Math.PI / 180
  const arcD = `M${(PX + 12 * Math.cos(a0)).toFixed(1)},${(PY + 12 * Math.sin(a0)).toFixed(1)}A12,12 0 0,1 ${(PX + 12 * Math.cos(a1)).toFixed(1)},${(PY + 12 * Math.sin(a1)).toFixed(1)}`
  const arc = `<path d="${arcD}" fill="none" stroke="#fff" stroke-width="1.4" stroke-dasharray="14 14" stroke-dashoffset="14">` +
    `<animate attributeName="stroke-dashoffset" values="14;0;0;14" keyTimes="0;.5;.85;1" dur="${d}s" ${b} ${R}/></path>`
  const arm = `<line x1="${SH.x}" y1="${SH.y}" x2="${pts[0]![0]!.toFixed(1)}" y2="${pts[0]![1]!.toFixed(1)}" stroke="${c.body}" stroke-width="5" stroke-linecap="square">` +
    anim('x2', vals(0)) + anim('y2', vals(1)) + `</line>` +
    `<rect x="${(pts[0]![0]! - 3).toFixed(1)}" y="${(pts[0]![1]! - 2).toFixed(1)}" width="6" height="6" fill="${c.body}">` +
    anim('x', vals(0, -3)) + anim('y', vals(1, -2)) + `</rect>`
  const sw = sweat(c, CX - 40, -58, 1.1, -1) + sweat(c, CX - 44, -46, 1.4, -1)
  // the plan grows: a ring is drawn and stays, then a dotted line joins it, then it all resets
  const L = 6.4
  const lb = `begin="-${(c.ph * L).toFixed(2)}s"`
  const ring = `<circle cx="20" cy="-62" r="5" fill="none" stroke="#fff" stroke-width="1.3" stroke-dasharray="32 32" stroke-dashoffset="32">` +
    `<animate attributeName="stroke-dashoffset" values="32;0;0;32" keyTimes="0;.35;.92;1" dur="${L}s" ${lb} ${R}/></circle>`
  const dots = `<path d="M20,-67V-73" stroke="#fff" stroke-width="1.2" stroke-dasharray="2 2" opacity="0">` +
    `<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;.45;.55;.92;1" dur="${L}s" ${lb} ${R}/></path>`
  // eraser shavings dribbling off the board edge
  const shav = [0, 1, 2].map(i => {
    const bg = `begin="-${((i / 3 + c.ph) * 1.5).toFixed(2)}s"`
    return `<g opacity="0">${r(62 + i * 3, -46, 2, 1, p.paper)}` +
      `<animate attributeName="opacity" values="1;1;0" dur="1.5s" ${bg} ${R}/>` +
      `<animateTransform attributeName="transform" type="translate" values="0,0;${i - 1},40" dur="1.5s" ${bg} ${R}/></g>`
  }).join('')
  return ring + dots + arc + shav + stool(c) + clawdLocal(c, eyes, -14, 0.8) + sw + arm + compass
}

function waiting(c: Ctx, eyes: ClawdEyes): string {
  const { p } = c
  const d = 0.7
  const watch = `<g transform="translate(${CX - 40},-32)">` +
    `<path d="M8,-2L4,-10" stroke="${p.accent}" stroke-width="1" fill="none"/>` +
    `<circle cx="0" cy="0" r="7" fill="${p.accent}"/><circle cx="0" cy="0" r="5.5" fill="${p.paper}"/>` + r(-1, -9, 2, 2, p.accent) +
    `<g><rect x="-.5" y="-4.5" width="1" height="5" fill="${p.ink}"/><animateTransform attributeName="transform" type="rotate" values="0;360" dur="2s" ${R}/></g>` +
    r(-1, -1, 3, 1, p.ink) + `</g>` +
    r(CX - 34, -31, 6, 5, c.body)
  // pupils glance left at the watch
  const glance = eyes === 'normal'
    ? r(-14, -32, 5, 10, c.body) + r(9, -32, 5, 10, c.body) + r(-17, -31, 5, 9, p.ink) + r(6, -31, 5, 9, p.ink)
    : ''
  const tilt = `<animateTransform attributeName="transform" type="rotate" values="0 ${CX - 20} 0;-3 ${CX - 20} 0;0 ${CX - 20} 0" dur="${d}s" begin="-${(c.ph * d).toFixed(2)}s" ${R}/>`
  const q = `<g><text x="${CX + 4}" y="-56" font-family="monospace" font-weight="bold" font-size="22" fill="${p.paper}" stroke="${p.ink}" stroke-width="1">?</text>` +
    `<animateTransform attributeName="transform" type="translate" values="0,0;0,-4;0,0" dur="1.2s" ${R}/></g>`
  // right arm reaches up to the ledge and drums its fingers, impatiently
  const bd = `dur="${(d / 2).toFixed(2)}s" begin="-${(c.ph * d).toFixed(2)}s" ${R}`
  const drum = `<line x1="${CX + 32}" y1="-26" x2="${CX + 40}" y2="-44" stroke="${c.body}" stroke-width="5"/>` +
    `<g>${r(CX + 36, -50, 9, 5, c.body)}${r(CX + 37, -46, 2, 2, c.shade)}${r(CX + 41, -46, 2, 2, c.shade)}` +
    `<animateTransform attributeName="transform" type="translate" values="0,0;0,-3;0,0" ${bd}/></g>` +
    `<g opacity="0">${r(CX + 47, -53, 3, 1, p.paper)}${r(CX + 47, -48, 3, 1, p.paper)}` +
    `<animate attributeName="opacity" values="0;1;0" ${bd}/></g>` +
    `<path d="M24,-56L34,-60L44,-56" stroke="${p.ink}" stroke-width="2" fill="none"/>` + r(32.5, -62, 3, 3, p.accent)
  return `<g>${tilt}${person(c, eyes, { over: glance, pencil: false })}${watch}</g>` + drum + q
}

function idle(c: Ctx, eyes: ClawdEyes): string {
  const { p } = c
  // squash + skew about the floor line: feet stay planted, head droops left
  const slump = `<g transform="translate(${CX},0) skewX(9) scale(1,.88) translate(${-CX},0)">` +
    person(c, eyes, { pencil: false, slip: true }) + `</g>`
  const z = (i: number) => {
    const dur = 3, bg = `begin="-${((i / 3 + c.ph) * dur).toFixed(2)}s"`
    return `<text x="${CX - 6}" y="-44" font-family="monospace" font-weight="bold" font-size="${8 + i * 3}" fill="${p.paper}" opacity="0">z` +
      `<animate attributeName="opacity" values="0;1;0" dur="${dur}s" ${bg} ${R}/>` +
      `<animateTransform attributeName="transform" type="translate" values="0,0;10,-36" dur="${dur}s" ${bg} ${R}/></text>`
  }
  // pencil dropped on the floor, compass flopped on the ledge
  const dropped = r(CX - 46, -3, 16, 3, p.accent) + r(CX - 30, -3, 3, 3, p.danger) +
    `<path d="M24,-46L36,-50L48,-46" stroke="${p.ink}" stroke-width="2" fill="none"/>` + r(34.5, -52, 3, 3, p.accent)
  return dropped + slump + z(0) + z(1) + z(2)
}

function done(c: Ctx, eyes: ClawdEyes): string {
  const { p } = c
  const crate = r(CX - 26, -15, 52, 15, p.accentAlt) + r(CX - 26, -15, 52, 2, p.metalLight) +
    `<path d="M${CX - 24},-13L${CX + 24},-2M${CX + 24},-13L${CX - 24},-2" stroke="${p.metalDark}" stroke-width="1.5"/>` +
    r(CX - 26, -15, 52, 15, 'none', ` stroke="${p.metalDark}" stroke-width="1"`)
  // cup of tea raised in the left hand, with a periodic sip
  const sip = `<animateTransform attributeName="transform" type="translate" values="0,0;0,0;5,-8;5,-8;0,0" keyTimes="0;.55;.65;.85;1" dur="4s" begin="-${(c.ph * 4).toFixed(2)}s" ${R}/>`
  const cup = `<g transform="translate(${CX - 42},-44)"><g>${sip}` +
    r(-7, 0, 14, 11, p.paper) + r(-7, 0, 14, 11, 'none', ` stroke="${p.ink}" stroke-width="1"`) + r(-6, 1, 12, 2, p.accentAlt) +
    `<path d="M-7,2.5h-4v5h4" stroke="${p.paper}" stroke-width="2.2" fill="none"/>` +
    r(-10, 11, 20, 2, p.paper) + r(4, 4, 7, 6, c.body) +
    `<path d="M-3,-2q-3,-4 0,-8q3,-4 0,-8M3,-2q-3,-4 0,-8q3,-4 0,-8" stroke="${p.paper}" stroke-width="1.6" fill="none">` +
    `<animate attributeName="opacity" values=".35;1;.35" dur="2.5s" ${R}/></path>` +
    `</g></g>`
  const roll = r(CX + 26, -36, 22, 6, c.blue) + r(CX + 26, -36, 22, 1, '#fff', ' opacity=".6"') +
    `<circle cx="${CX + 48}" cy="-33" r="3" fill="${c.blueDk}" stroke="#fff" stroke-width=".8"/>`
  const gold = `<polygon points="62,-82 63.5,-78 67.5,-78 64.5,-75.5 65.5,-71.5 62,-74 58.5,-71.5 59.5,-75.5 56.5,-78 60.5,-78" fill="${p.accent}" stroke="${p.ink}" stroke-width=".6"/>`
  const stamp = `<g transform="rotate(-8 44 -61)">` + r(23, -68, 42, 13, p.paper) +
    `<rect x="25" y="-66" width="38" height="9" fill="none" stroke="${p.danger}" stroke-width="1.5"/>` +
    `<text x="44" y="-58.8" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="8" fill="${p.danger}">APPROVED</text></g>`
  const ahh = `<text x="${CX - 6}" y="-66" font-family="monospace" font-size="9" font-style="italic" fill="${p.paper}">ahh~</text>`
  const compass = `<path d="M54,-46L60,-58L66,-46" stroke="${p.ink}" stroke-width="2" fill="none"/>` + r(58.5, -61, 3, 3, p.accent)
  return stamp + gold + compass + crate + person(c, eyes, { y: -13 }) + roll + cup + ahh
}

function failed(c: Ctx, eyes: ClawdEyes): string {
  const { p } = c
  const W = '#fff'
  // the PLAN itself fails: one box left, its arrow U-turns back into itself,
  // the other box tumbles off the sheet, and someone scrawled TODO: ???
  const boxA = `<rect x="15.5" y="-81.5" width="13" height="8" fill="none" stroke="${W}" stroke-width="1.2"/>`
  const loop = `<path d="M29,-77.5H38V-69H22V-73" stroke="${W}" stroke-width="1.2" fill="none"/><polygon points="22,-73 19.5,-69 24.5,-69" fill="${W}" transform="rotate(180 22 -71)"/>`
  const tumble = `<g><g transform="translate(64,-62)"><rect x="-6.5" y="-4" width="13" height="8" fill="none" stroke="${W}" stroke-width="1.2"/>` +
    `<animateTransform attributeName="transform" type="rotate" values="0;200;360" dur="2s" ${R}/></g>` +
    `<animateTransform attributeName="transform" type="translate" values="0,0;8,30;14,72;14,72" keyTimes="0;.4;.7;1" dur="2.6s" ${R}/>` +
    `<animate attributeName="opacity" values="1;1;1;0" keyTimes="0;.6;.7;1" dur="2.6s" ${R}/></g>`
  const todo = `<text x="14" y="-52" font-family="monospace" font-weight="bold" font-size="8" fill="${W}" transform="rotate(-5 15 -53)">TODO: ???</text>`
  const blot = `<polygon points="44,-82 52,-84 60,-78 58,-70 50,-70 44,-75" fill="${p.ink}"/>` + r(52, -70, 3, 6, p.ink) +
    `<polygon points="71,-85 71,-70 60,-85" fill="${p.metal}"/><polygon points="60,-85 71,-70 64,-72" fill="${p.paper}" opacity=".7"/>`
  const puff = (i: number) => {
    const dur = 2.4, bg = `begin="-${((i / 3 + c.ph) * dur).toFixed(2)}s"`
    return `<circle cx="${44 + i * 6}" cy="-84" r="5" fill="${p.smoke}" stroke="${p.paper}" stroke-width="1" opacity="0">` +
      `<animate attributeName="opacity" values="0;.95;0" dur="${dur}s" ${bg} ${R}/>` +
      `<animate attributeName="r" values="3;9" dur="${dur}s" ${bg} ${R}/>` +
      `<animateTransform attributeName="transform" type="translate" values="0,0;${i * 3 - 3},-16" dur="${dur}s" ${bg} ${R}/></circle>`
  }
  const spark = (x: number, y: number, k: number) =>
    `<g opacity="0">${r(x - 1, y - 4, 2, 8, p.accent)}${r(x - 4, y - 1, 8, 2, p.accent)}${r(x - 1, y - 1, 2, 2, '#fff')}` +
    `<animate attributeName="opacity" values="0;1;0;0" dur=".9s" begin="-${(k * 0.3).toFixed(1)}s" ${R}/></g>`
  // broken compass on the table ledge: snapped legs (light outline) + boinging spring
  const leg = (d: string) => `<path d="${d}" stroke="${p.metalLight}" stroke-width="4"/><path d="${d}" stroke="${p.ink}" stroke-width="2"/>`
  const broken = leg('M10,-47L22,-51') + leg('M27,-48L40,-47') + r(21, -54, 4, 4, p.accent) +
    `<g><path d="M23,-54l3,-3l-4,-2l4,-2l-4,-2l3,-3" stroke="${p.paper}" stroke-width="1.4" fill="none"/>` +
    `<animateTransform attributeName="transform" type="translate" values="0,0;0,-4;0,0" dur=".5s" ${R}/></g>`
  const star = (k: number) => `<g>${r(-1, -3, 2, 6, p.accent)}${r(-3, -1, 6, 2, p.accent)}` +
    `<animateMotion path="M16,0A16,5 0 1,1 -16,0A16,5 0 1,1 16,0" dur="1.6s" begin="-${(k * 1.6 / 3).toFixed(2)}s" ${R}/></g>`
  const stars = `<g transform="translate(${CX - 6},-52)">${star(0)}${star(1)}${star(2)}</g>`
  const dazed = `<g transform="rotate(-7 ${CX} 0)">${person(c, eyes, { cracked: true, pencil: false })}</g>`
  const plan = `<g transform="rotate(4 41 -44)">${boxA}${loop}${todo}${tumble}</g>`
  return plan + blot + puff(0) + puff(1) + puff(2) + spark(14, -84, 0) + spark(70, -50, 1) + spark(56, -88, 2) + broken + dazed + stars
}

/** Whip landing: OW!, welt, flying sweat; wraps the character group in a flinch. */
function flinch(c: Ctx, inner: string, wy = -49): string {
  const { p } = c
  const welt = r(CX - 6, wy, 12, 5, p.danger) + r(CX - 4, wy + 1, 8, 1, '#fff', ' opacity=".5"')
  const drops = [[-1, -1], [1, -1.4], [-1.6, -0.3], [1.5, -0.2]].map(([dx = 0, dy = 0], i) => {
    const ox = CX + (dx < 0 ? -36 : 30), oy = -58
    return `<g opacity="0"><polygon points="${ox},${oy} ${ox - 2},${oy + 4} ${ox + 2},${oy + 4}" fill="${c.drop}"/>${r(ox - 2, oy + 4, 4, 2, c.drop)}` +
    `<animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.6;0.62;1" ${WHIP_SYNC}/>` +
    `<animateTransform attributeName="transform" type="translate" values="0,0;0,0;${dx * 14},${dy * 16}" keyTimes="0;0.6;1" ${WHIP_SYNC}/></g>`
  }).join('')
  return whipFlinch(inner + welt) + drops + owText(CX + 24, -94, p)
}

/** The plan worker and its workstation, feet-centre at (w.x, w.y). */
export function planWorker(w: WorkerView, p: Palette): string {
  const nudge = (w.seed % 13) - 6
  const c: Ctx = {
    p,
    body: tint(p.clawd, 14 + nudge),
    shade: tint(p.clawdDark, 14 + nudge),
    blue: tint(p.clawd, 190, -0.12),
    blueDk: tint(p.clawdDark, 190, -0.05),
    drop: tint(p.clawd, 185, 0.22),
    ph: (w.seed % 10) / 10,
    seed: w.seed,
  }
  const st = w.status
  const wide = w.isTarget && st !== 'failed'
  const eyes: ClawdEyes = wide ? 'wide'
    : st === 'idle' ? 'closed' : st === 'done' ? 'happy' : st === 'failed' ? 'dead' : 'normal'
  const station = table(c) +
    (st === 'failed' ? `<g transform="rotate(4 41 -44)">${blueprint(c, false, false)}</g>` : blueprint(c, false)) +
    (st === 'failed' ? '' : tsquare(c)) + bin(c)
  const who = st === 'working' ? working(c, eyes)
    : st === 'waiting' ? waiting(c, eyes)
    : st === 'idle' ? idle(c, eyes)
    : st === 'done' ? done(c, eyes)
    : failed(c, eyes)
  return `<g transform="translate(${w.x},${w.y})" shape-rendering="crispEdges">` +
    station + (w.isTarget ? flinch(c, who, st === 'working' ? -61 : st === 'done' ? -56 : -43) : who) + `</g>`
}
