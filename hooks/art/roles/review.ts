import type { Palette, WorkerView } from '../types.ts'
import type { ClawdEyes } from '../clawd.ts'
import { clawd, flinch, ow, tint, WHIP_SYNC, WORKER_SCALE } from '../clawd.ts'

// The Quality Inspector: bowler hat, monocle on a chain, clipboard, and a
// rubber stamp that slams APPROVED / REJECTED on widgets at the Q.C. bench.
// Local frame: origin = feet-centre; inspector stands left, bench to the right.

const R = (x: number, y: number, w: number, h: number, f: string, ex = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${ex}/>`
const T = (x: number, y: number, s: number, f: string, t: string, ex = '') =>
  `<text x="${x}" y="${y}" font-size="${s}" fill="${f}"${ex}>${t}</text>`
const IND = ' repeatCount="indefinite"'
const anim = (a: string, v: string, d: number, b: number, ex = '') =>
  `<animate attributeName="${a}" values="${v}" dur="${d}s"${b ? ` begin="${-b}s"` : ''}${IND}${ex}/>`
const move = (v: string, d: number, b: number, ex = '') =>
  `<animateTransform attributeName="transform" type="translate" values="${v}" dur="${d}s"${b ? ` begin="${-b}s"` : ''}${IND}${ex}/>`
const spin = (v: string, d: number, b: number, ex = '') =>
  `<animateTransform attributeName="transform" type="rotate" values="${v}" dur="${d}s"${b ? ` begin="${-b}s"` : ''}${IND}${ex}/>`

function hat(p: Palette, band: string): string {
  return R(-21, -43, 42, 3, p.ink) + R(-15, -52, 30, 9, p.ink) + R(-11, -55, 22, 3, p.ink) +
    R(-15, -46, 30, 3, band) + R(-9, -53, 4, 2, p.metal)
}

/** Monocle glass (centred on 0,0), with ink inner ring and a raised gleam. */
function glass(p: Palette, r: number): string {
  return `<circle cx="0" cy="0" r="${r}" fill="#fff" fill-opacity=".1" stroke="${p.accent}" stroke-width="2"/>` +
    `<circle cx="0" cy="0" r="${r - 1.6}" fill="none" stroke="${p.ink}" stroke-width="1"/>` +
    R(r * 0.25, -r + 1.5, 2, 2, '#fff')
}

/** mode: on = over the eye, dangle = hanging off the body side (static), swing = popped off and swinging. */
function monocle(p: Palette, mode: 'on' | 'dangle' | 'swing', ph: number): string {
  const chain = (d: string) => `<path d="${d}" stroke="${p.accent}" stroke-width="1.2" stroke-dasharray="1.5 1" fill="none"/>`
  if (mode === 'on') {
    return `<g transform="translate(11.5,-27)">${glass(p, 7.5)}</g>` + chain('M18,-22 L22,-16 L20,-10')
  }
  const hang = chain('M18,-24 L22,-17 L23,-14') + `<g transform="translate(23,-9)">${glass(p, 5)}</g>`
  if (mode === 'dangle') return hang
  // popped: lens springs up off the face and bounces in mid-air, empty socket below
  return `<g>${move('11.5,-27;24,-52;26,-45;26,-49;26,-48;26,-48', 1, 0, ' keyTimes="0;.12;.24;.34;.42;1"')}${glass(p, 7)}` +
    chain('M-3,6 L-6,12 L-12,18') + `</g>`
}

function clipboard(p: Palette, tilt: number): string {
  return R(-41, -33, 14, 18, p.metalDark) +
    `<g transform="rotate(${tilt} -34 -23)">` + R(-40, -30, 12, 14, p.paper) +
    R(-38, -27, 8, 1, p.ink) + R(-38, -24, 6, 1, p.ink) + R(-38, -21, 8, 1, p.ink) + `</g>` +
    R(-37, -35, 6, 3, p.metalLight)
}

function bench(p: Palette, label: string, lc: string, belt: boolean, ph: number, labelEx = ''): string {
  return R(14, -25, 5, 25, p.metalDark) + R(65, -25, 5, 25, p.metalDark) +
    R(12, -25, 60, 11, p.metal) + R(12, -25, 60, 1, p.metalDark) + T(42, -17, 7, lc, label, labelEx) +
    R(10, -31, 64, 6, p.metalLight) + R(10, -26, 64, 1, p.metalDark) +
    (belt
      ? `<line x1="11" y1="-30.5" x2="73" y2="-30.5" stroke="${p.metalDark}" stroke-width="1" stroke-dasharray="3 3">` +
        anim('stroke-dashoffset', '0;6', 0.4, ph) + `</line>`
      : '')
}

function widget(p: Palette, x: number, y = -30): string {
  return R(x, y - 6, 12, 6, p.metalLight) + R(x + 2, y - 5, 8, 4, p.metal) + R(x, y - 6, 12, 1, '#fff', ' opacity=".35"')
}

function stampMark(p: Palette, x: number, y: number, word: string, c: string, rot: number, s = 8, backed = false): string {
  const w = word.length * s * 0.62 + 8
  return `<g transform="rotate(${rot} ${x} ${y})">` +
    R(x - w / 2, y - s - 1, w, s + 6, backed ? p.paper : 'none', ` stroke="${c}" stroke-width="2.5"`) +
    R(x - w / 2 + 2, y - s + 1, w - 4, s + 2, 'none', ` stroke="${p.ink}" stroke-width=".8"`) +
    T(x, y + 1, s, p.ink, word) + `</g>`
}

/** The stamp, drawn in its DOWN pose (rubber bottom on y -36). */
function stampTool(p: Palette, ink: string): string {
  return R(16, -53, 12, 3, p.accentAlt) + R(20, -50, 4, 7, p.accentAlt) +
    R(13, -43, 18, 5, p.metal) + R(13, -43, 18, 1, p.metalLight) + R(14, -38, 16, 2, ink)
}

/** Stamp at rest on the bench (or broken: handle snapped off, rubber face-up). */
function stampResting(p: Palette, broken: boolean): string {
  if (broken) {
    // snapped handle lying on the bench, base face-up with its red rubber
    return `<g transform="rotate(-12 54 -33)">` + R(48, -34, 9, 3, p.accentAlt) + R(56, -36, 3, 7, p.accentAlt) + `</g>` +
      R(60, -36, 13, 5, p.metal) + R(61, -38, 11, 2, p.danger) + R(62, -40, 2, 2, p.accentAlt) + R(68, -39, 3, 1, p.accentAlt)
  }
  return R(50, -37, 18, 6, p.metal) + R(51, -32, 16, 1, p.ink) + R(57, -47, 4, 10, p.accentAlt) + R(54, -51, 10, 4, p.accentAlt)
}

export function reviewWorker(w: WorkerView, p: Palette): string {
  const s = w.seed
  const hue = -27 + ((s % 9) - 4)
  const body = tint(p.clawd, hue, 0.04)
  const shade = tint(p.clawdDark, hue, 0.03)
  const ph = (s % 10) * 0.12
  const st = w.status
  const approveFirst = s % 2 === 0
  const A = approveFirst ? ['APPROVED', p.ok] : ['REJECTED', p.danger]
  const B = approveFirst ? ['REJECTED', p.danger] : ['APPROVED', p.ok]
  const band = s % 3 === 0 ? p.danger : s % 3 === 1 ? p.metalDark : p.accentAlt
  const leftMono = s % 2 === 1
  const tilt = (s % 9) - 4
  const inkC = [p.danger, p.ink, p.accentAlt][(s >> 2) % 3]!
  const rejects = 1 + (s % 3)

  let eyes: ClawdEyes = st === 'done' ? 'happy' : st === 'idle' ? 'closed' : st === 'failed' ? 'dead' : 'normal'
  if (w.isTarget && st !== 'failed') eyes = 'wide'

  // costume, in the sprite's local frame
  let over = ''
  if (s % 4 === 1) over += R(-18 + (s % 7), -17, 6, 4, shade) + R(-16 + (s % 7), -16, 2, 2, p.paper, ' opacity=".5"')
  const monoMode = st === 'failed' ? 'dangle' : w.isTarget ? 'swing' : 'on'
  const mono = monocle(p, monoMode, ph)
  over += leftMono ? `<g transform="scale(-1,1)">${mono}</g>` : mono
  if (s % 3 === 0 && st !== 'failed') over += R(-1, -19, 10, 2, p.ink) + R(-3, -18, 3, 2, p.ink) + R(8, -18, 3, 2, p.ink)
  if (st !== 'idle') over += clipboard(p, tilt)
  if (st === 'failed') {
    over += stampMark(p, 0, -13, 'REJECTED', p.danger, -14, 7, true)
  } else if (st === 'idle') {
    over += `<g transform="translate(-2,8) rotate(-8)">${hat(p, band)}</g>`
  } else if (st === 'done') {
    over += `<g transform="rotate(-6 0 -43)">${hat(p, band)}</g>`
  } else {
    over += hat(p, band)
  }
  if (st === 'working') {
    const sw = (x: number, d: number) =>
      `<g>${move('0,0;-3,12', 0.9, ph + d)}${anim('opacity', '1;1;0', 0.9, ph + d)}${R(x, -38, 3, 4, '#fff')}${R(x + 1, -40, 1, 2, '#fff')}</g>`
    over += sw(-31, 0) + sw(-34, 0.3) + sw(-30, 0.6)
  }
  if (w.isTarget && st !== 'failed') {
    over += `<path d="M14,-19 l7,-5 M15,-14 l7,-5" stroke="${p.danger}" stroke-width="2.5"/>`
  }

  const sitY = st === 'done' ? -15 : 0
  let fig = clawd({ x: -30, y: sitY, scale: WORKER_SCALE, body, shade, eyes, ink: p.ink, bob: st === 'working' ? 0.6 : 0, over })
  if (st === 'idle') fig = `<g transform="scale(1,0.9)">${fig}</g>`

  let out = ''
  let held = '' // hand props: move with the figure when it flinches
  // workstation
  if (st === 'working') {
    const kt = ' keyTimes="0;.33;.4;.48;.6;1"'
    out += bench(p, 'Q.C.', p.accent, true, ph)
    // widget slides under the stamp, gets marked, slides out keeping its mark
    const glyphOK = `<g transform="rotate(-12 22 -33)">${R(16, -37, 12, 8, p.paper, ` stroke="${p.ok}" stroke-width="1.5"`)}${T(22, -31, 6, p.ink, 'OK')}</g>`
    const xs = 'M18,-36 l8,6 M26,-36 l-8,6'
    const glyphX = `<path d="${xs}" stroke="${p.ink}" stroke-width="3.5"/><path d="${xs}" stroke="${p.danger}" stroke-width="2"/>`
    // X underneath; the OK tag covers it on the approved slams
    const alt = (g: string, first: boolean) =>
      `<g>${anim('opacity', first ? '1;0' : '0;1', 2.4, ph, ' keyTimes="0;.5" calcMode="discrete"')}${g}</g>`
    out += `<g>${move('-10,0;0,0;0,0;40,0', 1.2, ph, ' keyTimes="0;.3;.7;1"')}${anim('opacity', '0;1;1;0', 1.2, ph, ' keyTimes="0;.12;.85;1"')}` +
      widget(p, 16) +
      `<g opacity="0">${anim('opacity', '0;1', 1.2, ph, ' keyTimes="0;.41" calcMode="discrete"')}` +
      glyphX + alt(glyphOK, approveFirst) + `</g></g>`
    // short forearm from the right nub to the stamp base; hand + stamp lift 7px
    const up = '0,-31 4,-23 16,-38 13,-45'
    const dn = '0,-31 4,-23 16,-31 13,-38'
    held += `<polygon points="${dn}" fill="${body}">` +
      `<animate attributeName="points" values="${up};${up};${dn};${dn};${up};${up}" dur="1.2s"${ph ? ` begin="${-ph}s"` : ''}${IND}${kt}/></polygon>`
    held += `<g>${move('0,-7;0,-7;0,0;0,0;0,-7;0,-7', 1.2, ph, kt)}${stampTool(p, inkC)}${R(10, -44, 6, 6, body)}${R(10, -39, 6, 1, shade)}</g>`
    // slam impact lines
    out += `<g opacity="0">${anim('opacity', '0;1;0', 1.2, ph, ' keyTimes="0;.4;.5" calcMode="discrete"')}` +
      R(6, -38, 5, 1, p.paper) + R(33, -38, 5, 1, p.paper) + R(8, -42, 3, 1, p.paper) + R(33, -42, 3, 1, p.paper) + `</g>`
    // verdict pop-ups, alternating per slam
    const pop = (k0: number, k1: number, v: string[], rot: number) =>
      `<g opacity="0">${anim('opacity', '0;1;0', 2.4, ph, ` keyTimes="0;${k0};${k1}" calcMode="discrete"`)}` +
      `<g transform="translate(46,-88)"><g>` +
      `<animateTransform attributeName="transform" type="scale" values="1.35;1.35;1;1" keyTimes="0;${k0};${k0 + 0.04};1" dur="2.4s"${ph ? ` begin="${-ph}s"` : ''}${IND}/>` +
      `<g transform="translate(-46,88)">${stampMark(p, 46, -88, v[0]!, v[1]!, rot, 8, true)}</g></g></g></g>`
    out += pop(0.2, 0.45, A, -9) + pop(0.7, 0.95, B, 7)
  }
  if (st === 'working' || st === 'waiting') {
    // rejects pile on the floor under the bench: 1-3 by seed
    for (let i = 0; i < rejects; i++) {
      const x = 34 + (i % 2) * 3
      out += widget(p, x, -i * 6) + `<path d="M${x + 3},${-i * 6 - 5} l6,4 M${x + 9},${-i * 6 - 5} l-6,4" stroke="${p.danger}" stroke-width="1.5"/>`
    }
  }
  if (st === 'working') {
    // drawn above
  } else if (st === 'waiting') {
    out += bench(p, 'Q.C.', p.paper, false, ph, ' opacity=".4"') + stampResting(p, false)
    // pocket watch on the monocle's chain, swinging from the hand
    held += `<g>${spin('-10 -3 -24;10 -3 -24;-10 -3 -24', 2.4, ph, ' calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1"')}` +
      `<path d="M-3,-24 L-1,-17 L0,-13" stroke="${p.accent}" stroke-width="1.2" stroke-dasharray="1.5 1" fill="none"/>` +
      `<circle cx="0" cy="-7" r="6" fill="${p.accent}"/><circle cx="0" cy="-7" r="4.5" fill="${p.paper}"/>` +
      R(-1, -14, 2, 2, p.accent) + R(-0.5, -10, 1, 3, p.ink) +
      `<line x1="0" y1="-7" x2="2.5" y2="-7" stroke="${p.ink}" stroke-width="1">` +
      `<animateTransform attributeName="transform" type="rotate" values="0 0 -7;90 0 -7;180 0 -7;270 0 -7" dur="4s" calcMode="discrete"${IND}/></line></g>`
    held += `<g>${move('0,0;0,-4;0,0', 1.2, ph)}${T(-30, -70, 16, p.paper, '?')}</g>`
    // foot tap: a boot toe on the front-right leg lifting
    const tapK = ' keyTimes="0;.2;.4;.6;.8" calcMode="discrete"'
    held += `<g>${move('0,0;0,-4;0,0;0,-4;0,0', 1.2, ph, tapK)}${R(-25, -4, 8, 4, p.ink)}${R(-25, -4, 8, 1, p.metalLight)}</g>`
  } else if (st === 'idle') {
    out += bench(p, 'Q.C.', p.paper, false, ph, ' opacity=".4"') + stampResting(p, false) + widget(p, 22)
    // clipboard slid to the floor
    out += `<g transform="translate(-60,0) rotate(-70)">` + R(0, -14, 18, 14, p.metalDark) +
      R(2, -13, 14, 12, p.paper) + R(4, -10, 9, 1, p.ink) + R(4, -7, 7, 1, p.ink) + `</g>`
    const z = (d: number, sz: number) =>
      `<g opacity="0">${move('0,0;14,-34', 3, ph + d)}${anim('opacity', '0;1;0', 3, ph + d)}${T(-10, -32, sz, p.paper, 'z')}</g>`
    out += z(0, 8) + z(1, 10) + z(2, 12)
  } else if (st === 'done') {
    // crate seat
    out += R(-52, -15, 44, 15, p.accentAlt) + R(-52, -15, 44, 2, p.metalDark) + R(-52, -8, 44, 1, p.metalDark) +
      R(-52, -15, 2, 15, p.metalDark) + R(-10, -15, 2, 15, p.metalDark) +
      `<path d="M-50,-13 L-12,-1" stroke="${p.metalDark}" stroke-width="1.5"/>`
    out += bench(p, 'ALL OK', p.paper, false, ph) + R(15, -23, 4, 4, p.ok) + R(65, -23, 4, 4, p.ok) + stampResting(p, false) +
      `<g transform="rotate(-6 30 -36)">${R(22, -40, 18, 9, p.paper, ` stroke="${p.ok}" stroke-width="1.5"`)}${T(31, -33, 6, p.ink, 'OK')}</g>`
    // cup of tea in the right hand
    held += R(-1, -47, 15, 2, p.paper) + R(-1, -45, 15, 1, p.metalDark) + R(2, -54, 9, 7, p.paper) + R(11, -52, 3, 4, p.paper) +
      R(3, -53, 7, 2, p.accentAlt) +
      `<g opacity=".7">${R(4, -59, 2, 3, p.smoke)}${R(6, -63, 2, 3, p.smoke)}${R(5, -67, 2, 3, p.smoke)}</g>`
    // sign-off tag
    out += `<g transform="rotate(-5 -30 -92)">${R(-49, -99, 38, 11, p.paper)}${R(-49, -99, 38, 11, 'none', ` stroke="${p.ok}" stroke-width="2.5"`)}` +
      `${T(-30, -91, 7, p.ink, 'SHIP IT')}</g>`
  } else {
    // failed: broken stamp, rejects piled up, smoke and sparks
    // knocked-off bowler resting upside-down on the bench; a rejected widget on the floor
    out += bench(p, '', p.paper, false, ph) + stampResting(p, true) +
      `<g transform="translate(26,-86) scale(1,-1)">${hat(p, band)}</g>` +
      widget(p, 38) + `<path d="M40,-6 l8,6 M48,-6 l-8,6" stroke="${p.danger}" stroke-width="2"/>` +
      T(42, -17, 7, p.paper, 'BUST', '') +
      `<g>${anim('opacity', '1;0;1;1;0;1', 0.9, ph, ' calcMode="discrete"')}${R(30, -24, 24, 9, p.metal)}</g>`
    const puff = (x: number, d: number, sz: number) =>
      `<g opacity="0">${move('0,0;4,-40', 2.4, ph + d)}${anim('opacity', '0;.85;0', 2.4, ph + d)}` +
      R(x, -46, sz, sz, p.smoke) + R(x + 2, -48 - sz / 2, sz - 4, 3, p.smoke) + `</g>`
    out += puff(46, 0, 10) + puff(54, 0.8, 12) + puff(40, 1.6, 8)
    const spark = (x: number, y: number, d: number) =>
      `<g opacity="0">${anim('opacity', '0;1;0;0', 0.6, ph + d, ' calcMode="discrete"')}` +
      R(x, y, 2, 2, p.accent) + R(x - 3, y - 2, 2, 2, p.accent) + R(x + 3, y - 3, 2, 2, '#fff') + `</g>`
    out += spark(64, -40, 0) + spark(46, -44, 0.2) + spark(70, -32, 0.4)
  }

  let figG = fig + held
  if (st === 'waiting') figG = `<g>${spin('0 -30 0;-3 -30 0;0 -30 0;3 -30 0;0 -30 0', 2.4, ph)}${figG}</g>`
  if (w.isTarget) figG = flinch(figG)
  out += figG

  if (w.isTarget) {
    const drop = (dx: number, dy: number, x: number, d: number) =>
      `<g opacity="0"><animateTransform attributeName="transform" type="translate" values="0,0;0,0;${dx},${dy}" keyTimes="0;${d};1" ${WHIP_SYNC}/>` +
      `<animate attributeName="opacity" values="0;0;1;0" keyTimes="0;${d};${d + 0.02};1" ${WHIP_SYNC}/>${R(x, -54, 3, 4, '#fff')}</g>`
    out += drop(-14, -10, -50, 0.6) + drop(10, -14, -12, 0.64) + ow(16, -88, p)
  }

  return `<g transform="translate(${w.x},${w.y})" shape-rendering="crispEdges" font-family="monospace" font-weight="bold" text-anchor="middle">${out}</g>`
}
