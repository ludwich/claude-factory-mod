import type { Palette, WorkerView } from '../types.ts'
import { clawd, esc, flinch, ow, tint, WHIP_SYNC, WORKER_SCALE } from '../clawd.ts'
import type { ClawdEyes } from '../clawd.ts'

// BOILER STOKER: soot-blackened Clawd in pushed-up goggles, shovelling coal
// into a roaring boiler whose pressure gauge keeps slamming into the red.

const r = (x: number, y: number, w: number, h: number, f: string, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${extra}/>`
/** Many same-coloured rects as one path: [x, y, w, h][] */
const px = (rs: number[][], f: string, extra = '') =>
  `<path d="${rs.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h-${w}z`).join('')}" fill="${f}"${extra}/>`
const INF = 'repeatCount="indefinite"'
const anim = (attr: string, values: string, dur: number, ph: number, kt = '', mode = '') =>
  `<animate attributeName="${attr}" values="${values}"${kt ? ` keyTimes="${kt}"` : ''}${mode ? ` calcMode="${mode}"` : ''} dur="${dur}s" begin="-${ph}s" ${INF}/>`
const rot = (values: string, dur: number, ph: number) =>
  `<animateTransform attributeName="transform" type="rotate" values="${values}" dur="${dur}s" begin="-${ph}s" ${INF}/>`
const move = (values: string, dur: number, ph: number, kt = '') =>
  `<animateTransform attributeName="transform" type="translate" values="${values}"${kt ? ` keyTimes="${kt}"` : ''} dur="${dur}s" begin="-${ph}s" ${INF}/>`
const txt = (x: number, y: number, s: string, size: number, f: string, extra = '') =>
  `<text x="${x}" y="${y}" font-family="monospace" font-size="${size}" font-weight="bold" fill="${f}"${extra}>${s}</text>`

/** Smoke puff that rises and fades from (x,y); the rise is capped so it never leaves the footprint (y >= -115). */
function puff(x: number, y: number, f: string, ph: number, big = 1, dur = 2.4, dx = 4): string {
  const rise = Math.max(0, Math.min(22 * big, y + 114))
  const w0 = Math.round(8 * big), w1 = Math.round(14 * big)
  return `<rect x="${x}" y="${y}" width="${w0}" height="${Math.round(7 * big)}" fill="${f}" opacity="0">` +
    anim('opacity', '0;.85;0', dur, ph) + anim('width', `${w0};${w1}`, dur, ph) +
    move(`0,0;${Math.round(dx * big)},-${rise}`, dur, ph) + `</rect>`
}

/** Same period as the shovel swing: the blade reaches the door at ~1/3. */
const SWING = 0.9

function boiler(w: WorkerView, p: Palette, ph: number): string {
  const s = w.status
  const label = esc(w.type.slice(0, 3).toUpperCase())
  const hot = s === 'working', warm = s === 'waiting' || s === 'idle', dead = s === 'done', broke = s === 'failed'
  let fire: string
  if (hot) {
    fire = r(34, -30, 26, 18, p.danger) +
      `<g>${anim('opacity', '1;.6;1;.8;1', 0.35, ph)}` +
      `<polygon points="34,-12 38,-26 42,-18 47,-30 51,-19 55,-27 60,-12" fill="${p.accentAlt}"/>` +
      `<polygon points="38,-12 42,-21 47,-25 52,-20 56,-12" fill="${p.accent}"/></g>` +
      // coal hits the fire: spark burst out of the door
      `<g transform="translate(36,-20)" opacity="0">${anim('opacity', '0;0;1;0;0', SWING, ph, '0;.3;.36;.6;1')}` +
      `<g><animateTransform attributeName="transform" type="scale" values="1;1;1;3;3" keyTimes="0;.3;.36;.6;1" dur="${SWING}s" begin="-${ph}s" ${INF}/>` +
      px([[-3, -3, 3, 3], [0, -4, 2, 2], [-3, 0, 2, 2], [1, -1, 3, 2]], p.accent) + `</g></g>`
  } else if (warm) {
    fire = r(34, -30, 26, 18, p.metalDark) + r(34, -14, 26, 2, p.ink) +
      [[37, -16], [43, -18], [49, -15], [54, -17]].map(([x, y], i) =>
        `<rect x="${x}" y="${y}" width="4" height="3" fill="${i % 2 ? p.accent : p.accentAlt}" opacity=".3">` +
        anim('opacity', '.25;1;.25', 1.6 + i * 0.3, ph + i * 0.5) + `</rect>`).join('')
  } else if (dead) {
    fire = r(34, -30, 26, 18, p.metalDark) + r(38, -15, 18, 3, p.smoke)
  } else {
    // blown-open firebox: door hanging off its hinge, wild flare, steam jet
    fire = r(34, -30, 26, 18, p.ink) +
      `<g>${anim('opacity', '1;.3;1;.6;1', 0.3, ph)}` +
      `<polygon points="35,-12 38,-27 42,-17 47,-31 51,-18 56,-28 59,-12" fill="${p.danger}"/>` +
      `<polygon points="38,-12 41,-22 45,-16 48,-26 52,-17 55,-23 57,-12" fill="${p.accentAlt}"/>` +
      `<polygon points="42,-12 45,-19 48,-22 51,-18 53,-12" fill="${p.accent}"/></g>` +
      `<polygon points="34,-30 22,-24 22,-6 34,-12" fill="${p.metal}"/>` +
      `<polygon points="33,-28 24,-23 24,-21 33,-26" fill="${p.metalLight}"/>` +
      r(25, -14, 2, 2, p.ink) + r(30, -20, 2, 2, p.ink)
  }
  const glow = hot
    ? `<rect x="22" y="-10" width="52" height="10" fill="${p.accent}">${anim('opacity', '.15;.45;.2;.35;.15', 0.5, ph)}</rect>`
    : ''
  // gauge: 18px dial centred (48,-63), danger arc top-right
  const dial = r(39, -72, 18, 18, p.metalDark) + r(40, -71, 16, 16, p.paper) +
    px([[50, -71, 4, 2], [53, -70, 2, 2], [54, -69, 2, 4]], p.danger) +
    px([[41, -64, 2, 1], [47, -70, 2, 1]], p.ink)
  let needle: string
  if (broke) {
    needle = r(47, -65, 2, 3, p.ink) +
      `<polygon points="43,-57 50,-58 50,-57 43,-56" fill="${p.danger}"/>` +
      `<polyline points="40,-70 45,-65 43,-61 50,-58 56,-55" stroke="${p.ink}" stroke-width="1" fill="none"/>` +
      `<polyline points="45,-65 52,-68 56,-71" stroke="${p.ink}" stroke-width="1" fill="none"/>`
  } else {
    needle = `<polygon points="46.5,-63 49.5,-63 48,-71" fill="${p.ink}" stroke="${p.paper}" stroke-width=".6">` +
      (hot ? rot('-50 48 -63;10 48 -63;-15 48 -63;70 48 -63;62 48 -63;-50 48 -63', 1.3, ph)
        : warm ? rot('-30 48 -63;-12 48 -63;-30 48 -63', 2.2, ph)
          : `<set attributeName="transform" to="rotate(-100 48 -63)"/>`) +
      `</polygon>` + r(47, -64, 2, 2, p.ink)
  }
  // red-zone pop
  const pop = hot
    ? `<g opacity="0">${anim('opacity', '0;1;0', 1.3, ph, '0;.58;.82', 'discrete')}` +
      txt(60, -70, '!', 13, p.danger, ` stroke="${p.ink}" stroke-width=".6"`) + `</g>`
    : ''
  const shake = hot
    ? `<animateTransform attributeName="transform" type="translate" values="0,0;1,0;-1,0;1,-1;0,0" keyTimes="0;.58;.64;.70;.76" calcMode="discrete" dur="1.3s" begin="-${ph}s" ${INF}/>`
    : ''
  const rivets = px([-76, -50, -6].flatMap(y => [28, 38, 58, 68].map(x => [x, y, 2, 2])), p.accent)
  return `<g>${shake}` + (
    // chimney (shortened so smoke stays inside the footprint)
    px([[26, -80, 46, 76], [30, -86, 38, 6], [53, -104, 14, 4]], p.metal) +
    px([[55, -100, 10, 14], [36, -90, 26, 4], [66, -80, 6, 76], [26, -52, 46, 3], [24, -6, 50, 6], [32, -32, 30, 22]], p.metalDark) +
    r(26, -80, 5, 76, p.metalLight) + rivets +
    dial + needle + pop +
    // stencil
    txt(49, -39, label, 10, p.paper, ' text-anchor="middle" opacity=".85"') +
    // firebox door + fire
    fire + (broke ? '' : r(32, -32, 30, 2, p.metalLight)) + glow +
    // coal pile
    `<polygon points="-74,0 -68,-10 -60,-14 -52,-9 -46,0" fill="${p.ink}"/>` +
    r(-66, -10, 3, 3, p.metalDark) + r(-56, -8, 3, 3, p.metalDark) +
    // chimney smoke
    (hot ? puff(55, -104, p.smoke, ph, 1, 1.6, -14) + puff(58, -104, p.smoke, ph + 0.8, 0.8, 1.6, -14)
      : warm ? puff(57, -104, p.smoke, ph, 0.7, 3, -10) : '') +
    // waiting: kettle on the boiler top, whistling in time with the '?'
    (s === 'waiting'
      ? `<g transform="translate(0,4)">` + px([[36, -98, 14, 8], [38, -100, 10, 2], [41, -102, 4, 2]], p.accentAlt) + r(36, -92, 14, 2, p.metalDark) +
        `<polygon points="36,-96 30,-101 31,-103 36,-99" fill="${p.accentAlt}"/>` + r(39, -97, 3, 3, p.accent) +
        `<g opacity="0">${anim('opacity', '0;1;0', 1, ph)}${move('0,0;-4,-4', 1, ph)}` +
        r(25, -106, 6, 4, p.paper) + r(22, -110, 4, 3, p.paper) + `</g>` +
        `<g>${anim('opacity', '1;0;1', 1, ph)}${px([[26, -100, 2, 1], [26, -103, 3, 1]], p.paper)}</g></g>`
      : '') +
    // failure: cracked boiler, hissing steam, sparks
    (broke
      ? `<polyline points="34,-80 30,-74 36,-68 32,-58" stroke="${p.ink}" stroke-width="2" fill="none"/>` +
        puff(18, -30, p.paper, ph, 1.2, 1.2) + puff(60, -48, p.smoke, ph + 0.8, 1.1) + puff(56, -104, p.ink, ph + 1.6, 1.2) +
        [[22, -34], [70, -36], [62, -88], [46, -50]].map(([x, y], i) =>
          `<rect x="${x}" y="${y}" width="3" height="3" fill="${p.accent}">${anim('opacity', '1;0;0;1', 0.4 + i * 0.13, ph)}</rect>`).join('')
      : '')
  ) + `</g>`
}

/** The boiler stoker and its boiler, feet-centre at (w.x, w.y). */
export function otherWorker(w: WorkerView, p: Palette): string {
  const s = w.status
  const sd = w.seed
  const ph = (sd % 10) / 10
  const hue = -8 + ((sd % 13) - 6)
  const body = tint(p.clawd, hue, -0.08)
  const shade = tint(p.clawdDark, hue, -0.08)
  const ink = '#1a1a1a'

  // accessories in clawd's local frame
  // soot: hard black smears (brow under the goggles, a cheek, the belly) + 1px dither
  const smudges = [
    [[-22, -21, 7, 3], [-8, -16, 10, 3], [14, -14, 6, 2]],
    [[14, -21, 8, 3], [-18, -14, 8, 3], [0, -18, 5, 2]],
    [[-21, -20, 5, 4], [6, -16, 12, 3], [-14, -13, 6, 2]],
  ][sd % 3]!
  const brow = [[-20, -35, 14, 2], [6, -35, 12, 2], [-6, -36, 12, 1]]
  const dither = [[-23, -18], [-16, -19], [-5, -14], [3, -15], [20, -19], [17, -12], [-11, -12], [9, -20]]
    .filter((_, i) => (sd >> i) & 1 || i % 3 === 0).map(([x = 0, y = 0]) => [x, y, 1, 1])
  const soot = px([...smudges, ...brow], ink, ' opacity=".82"') + px(dither, ink)
  const patch = sd % 2 ? r(12, -19, 7, 6, p.metalLight) + r(13, -18, 1, 1, ink) + r(17, -15, 1, 1, ink) : ''
  // goggles pushed up: metal rims, dark lenses + glint, strap across the forehead
  const lens = tint(p.ink, 0, 0.14)
  const round = (sd >> 2) % 2 === 0
  const rim = round
    ? [[-19, -51, 8, 1], [-20, -50, 10, 10], [-19, -40, 8, 1], [7, -51, 8, 1], [6, -50, 10, 10], [7, -40, 8, 1]]
    : [[-21, -50, 12, 10], [5, -50, 12, 10]]
  const goggles = r(-24, -38, 48, 3, p.ink) + r(-24, -38, 48, 1, p.metalDark) +
    px([...rim, [-9, -47, 14, 3]], p.metalLight) + px([[-20, -40, 10, 1], [6, -40, 10, 1]], p.metalDark) +
    px([[-18, -48, 6, 6], [8, -48, 6, 6]], lens) + px([[-17, -47, 1, 1], [9, -47, 1, 1], [-16, -46, 1, 1], [10, -46, 1, 1]], '#fff')

  // shovel: D-grip, 30px shaft gripped by both nubs, 16px blade, 12px coal lump
  const shaftC = sd % 2 ? p.metalDark : p.accentAlt
  const handle = px([[-6, -25, 8, 2], [-6, -25, 2, 9], [0, -25, 2, 9], [-6, -18, 8, 2]], p.metalDark) +
    `<polygon points="2,-21 40,-14 39,-10 2,-17" fill="${shaftC}"/>` +
    `<polygon points="2,-21 40,-14 40,-13 2,-20" fill="${p.metalLight}" opacity=".5"/>` +
    r(5, -23, 7, 8, body) + r(5, -16, 7, 1, shade) + r(23, -20, 7, 8, body) + r(23, -13, 7, 1, shade)
  const blade = `<polygon points="38,-19 55,-15 53,-3 36,-7" fill="${p.metalLight}"/>` +
    `<polygon points="53,-3 55,-15 56,-14 54,-2" fill="${p.metalDark}"/>`
  const coal = `<g>${anim('opacity', '1;1;0;0;1', SWING, ph, '0;.3;.34;.95;1')}` +
    `<polygon points="40,-17 45,-23 52,-22 54,-16 50,-12 42,-13" fill="${p.ink}"/>` + r(46, -20, 2, 2, p.metal) + `</g>`
  let tool = ''
  let extra = ''
  let over = soot + patch + goggles
  let eyes: ClawdEyes = 'normal'
  let cy = 0, tilt = 0, pivot = 0, bob = 0
  const cx = -20
  const lean = sd % 2 ? 1 : -1

  if (s === 'working') {
    tool = `<g>${rot(`-26 8 -19;6 8 -19;6 8 -19;-26 8 -19`, SWING, ph)}${handle}${blade}${coal}</g>`
    eyes = 'angry'
    bob = 0.45
    extra = [[-46, -46], [-8, -52]].map(([x, y], i) =>
      `<rect x="${x}" y="${y}" width="3" height="4" fill="${p.paper}" opacity="0">` +
      anim('opacity', '0;1;0', 0.9, ph + i * 0.45) + move(`0,0;${i ? 4 : -4},10`, 0.9, ph + i * 0.45) + `</rect>`).join('')
  } else if (s === 'waiting') {
    // shovel leant on the boiler, pocket watch out, foot tapping
    tool = `<polygon points="${32 + lean * 3},-50 ${35 + lean * 3},-50 40,-2 37,-2" fill="${p.accentAlt}"/>` +
      `<polygon points="34,-4 44,-4 46,3 32,3" fill="${p.metalLight}"/>`
    extra = `<g>${move('0,0;0,-3;0,0', 1, ph)}${txt(-28, -60, '?', 18, p.paper)}</g>`
    // look left at the watch: repaint eyes shifted left
    over = r(-15, -33, 30, 12, body) + r(-17, -30, 5, 9, ink) + r(6, -30, 5, 9, ink) + over +
      `<path d="M-24,-18 Q-30,-10 -36,-16 Q-40,-20 -40,-24" stroke="${p.accent}" stroke-width="1.5" fill="none"/>` +
      r(-46, -34, 12, 12, p.accent) + r(-41, -36, 2, 2, p.accent) + r(-44, -32, 8, 8, p.paper) +
      `<rect x="-40.5" y="-31" width="1" height="3" fill="${ink}">${rot('0 -40 -28;360 -40 -28', 2, ph)}</rect>` +
      `<g>${move('0,0;0,-3;0,0;0,0', 0.5, ph)}${r(16, -2, 8, 3, p.ink)}</g>`
  } else if (s === 'idle') {
    eyes = 'closed'
    tilt = 8
    pivot = 26
    tool = `<polygon points="22,-30 25,-30 34,-2 31,-2" fill="${p.accentAlt}"/>`
    extra = `<g>${anim('opacity', '0;1;1;0', 3, ph)}${move('0,0;8,-14', 3, ph)}` +
      txt(-6, -58, 'z', 10, p.paper) + txt(2, -66, 'z', 12, p.paper) + txt(12, -76, 'Z', 14, p.paper) + `</g>`
  } else if (s === 'done') {
    eyes = 'happy'
    cy = -14
    over += r(-40, -26, 10, 9, p.paper) + r(-30, -24, 3, 5, p.paper) + r(-39, -25, 8, 2, p.accentAlt) +
      `<g>${anim('opacity', '0;.8;0', 2, ph)}${move('0,0;-2,-10', 2, ph)}${r(-37, -32, 2, 4, p.smoke)}${r(-33, -35, 2, 4, p.smoke)}</g>`
  } else {
    eyes = 'dead'
    tilt = -12
    pivot = -26
    over += `<polygon points="26,-27 36,-24 35,-21 25,-24" fill="${p.accentAlt}"/>` +
      `<polygon points="36,-24 39,-26 38,-21" fill="${p.paper}"/>`
    extra = `<g>${rot('0 -20 -56;360 -20 -56', 1.2, ph)}` +
      [[-32, -58], [-10, -58], [-21, -48]].map(([x = 0, y = 0]) => r(x, y, 4, 4, p.accent)).join('') + `</g>`
  }

  if (w.isTarget) {
    eyes = 'wide'
    // sticking-plaster cross over a fresh welt on the left cheek
    const welt = tint(p.danger, -8, -0.08)
    over += r(-22, -21, 13, 5, welt) + r(-20, -20, 9, 3, p.paper) + r(-17, -21, 3, 7, p.paper) + r(-9, -20, 2, 2, welt)
  }

  let guy = clawd({ x: 0, y: 0, scale: WORKER_SCALE, body, shade, eyes, ink, bob, over: over + tool })
  if (tilt) guy = `<g transform="rotate(${tilt} ${pivot} 0)">${guy}</g>`
  if (w.isTarget) {
    guy = flinch(guy) + ow(22, -82, p) +
      `<g transform="translate(-4,-30)" opacity="0"><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.6;0.62;1" ${WHIP_SYNC}/><g>` +
      `<animateTransform attributeName="transform" type="scale" values="1;1;2.6" keyTimes="0;0.6;1" ${WHIP_SYNC}/>` +
      px([[-14, -6, 3, 4], [12, -8, 3, 4], [-12, 5, 3, 4]], p.paper) + `</g></g>`
  }

  const floor =
    (s === 'done'
      ? r(cx - 24, -16, 48, 16, p.accentAlt) + r(cx - 24, -16, 48, 3, p.metalLight) + r(cx - 24, -9, 48, 2, p.metalDark) +
        r(cx - 22, -14, 3, 14, p.metalDark) + r(cx + 19, -14, 3, 14, p.metalDark) +
        `<polygon points="-62,-12 -59,-12 -54,-46 -57,-46" fill="${p.accentAlt}"/>` +
        `<polygon points="-64,-6 -56,-6 -58,-14 -63,-14" fill="${p.metalLight}"/>` +
        // OFF sign hung on the cold boiler door
        `<polyline points="37,-30 47,-36 57,-30" stroke="${p.ink}" stroke-width="1" fill="none"/>` +
        r(34, -30, 26, 17, p.paper) + r(34, -30, 26, 1, p.metalLight) +
        txt(47, -22, 'OFF', 8, p.ink, ' text-anchor="middle"') + txt(47, -15, 'DUTY', 7, p.ink, ' text-anchor="middle"')
      : '') +
    (s === 'failed'
      ? `<polygon points="10,-2 22,0 21,4 9,2" fill="${p.metalLight}"/>` + r(4, -1, 8, 2, p.accentAlt)
      : '')

  return (
    `<g transform="translate(${w.x},${w.y})" shape-rendering="crispEdges">` +
    boiler(w, p, ph) + floor +
    `<g transform="translate(${cx},${cy})">${extra}${guy}</g>` +
    `</g>`
  )
}
