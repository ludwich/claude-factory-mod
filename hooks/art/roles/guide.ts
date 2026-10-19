import type { Palette, WorkerView } from '../types.ts'
import { clawd, ow, tint, WHIP_SYNC } from '../clawd.ts'

// The ARCHIVIST: a pink-peach Clawd in a green banker's visor and sleeve
// garters, perched on a crate at a tall lectern with a huge open RTFM
// ledger, a candle and a book stack that is one sneeze from disaster.

const r = (x: number, y: number, w: number, h: number, f: string, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${extra}/>`
const loop = (attr: string, values: string, dur: number, ph: number, extra = '') =>
  `<animate attributeName="${attr}" values="${values}" dur="${dur}s"${ph ? ` begin="-${ph}s"` : ''} repeatCount="indefinite"${extra}/>`
const spin = (type: string, values: string, dur: number, ph: number, extra = '') =>
  `<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${dur}s"${ph ? ` begin="-${ph}s"` : ''} repeatCount="indefinite"${extra}/>`
const txt = (x: number, y: number, s: string, size: number, f: string, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${f}"${extra}>${s}</text>`
const INK = ' stroke="#000" stroke-width="0.8"'

// Size budget: plain rects become path runs, and runs of the same fill merge.
const RECT = /<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" fill="([^"]+)"\/>/g
const RUN = /(<path d="[^"]*)" fill="([^"]+)"\/><path d="([^"]*)" fill="\2"\/>/g
function squash(svg: string): string {
  let s = svg.replace(RECT, (_m, x, y, w, h, f) => `<path d="M${x} ${y}h${w}v${h}h-${w}z" fill="${f}"/>`)
  for (let prev = ''; prev !== s;) { prev = s; s = s.replace(RUN, '$1$3" fill="$2"/>') }
  return s
}

type Mode = 'flip' | 'still' | 'stub' | 'closed' | 'fire'

function books(p: Palette, seed: number, count: number, sway: number, ph: number, burnt = false, slide = false): string {
  const cols = [p.danger, p.ok, p.accentAlt, p.metalLight, p.accent, p.smoke]
  let y = 0, out = '', ink = '', pap = '', top = ''
  for (let i = 0; i < count; i++) {
    const w = 18 + ((seed * (i + 3)) % 9)
    const h = 7 + ((seed + i * 5) % 3)
    // a steady lean to the right, and the top two overhang more and more
    const dx = ((seed >> (i % 5)) % 5) - 2 + i * 0.8 + (i === count - 1 ? 8 : i === count - 2 ? 4 : 0)
    y -= h
    const c = cols[(seed + i) % cols.length]!
    const bx = Math.max(-70, Math.round(-63 - w / 2 + dx))
    const lines = r(bx, y + h - 1, w, 1, p.ink) + r(bx + 3, y + 2, w - 6, 1, p.paper)
    if (burnt && i === count - 1) top = r(bx, y, w, 3, p.ink) + r(bx + 4, y - 2, 3, 2, p.ink)
    // one book in the middle creeps out every cycle: the sneeze is coming
    if (slide && i === 3) out += `<g>${spin('translate', '0,0;-5,0;-5,0;0,0', 1.8, ph, ' keyTimes="0;0.7;0.9;1"')}${r(bx, y, w, h, c)}${lines}</g>`
    else { out += r(bx, y, w, h, c); ink += r(bx, y + h - 1, w, 1, p.ink); pap += r(bx + 3, y + 2, w - 6, 1, p.paper) }
  }
  out += ink + pap + top
  if (!burnt) out += `<polygon points="-62,${y} -50,${y - 5} -38,${y} -50,${y - 2}" fill="${p.paper}" stroke="#000" stroke-width="0.6"/>`
  const anim = sway ? spin('rotate', `-${sway} -58 0;${sway} -58 0;-${sway} -58 0`, 2.6, ph) : ''
  return `<g>${anim}${out}</g>`
}

function lectern(p: Palette, mode: Mode, ph: number, grey: boolean): string {
  const wood = p.metal, dark = p.metalDark, lite = p.metalLight
  // foot, column, bracket, a little shelf with two books
  let s =
    r(22, -4, 36, 4, dark) + r(26, -7, 28, 3, wood) + r(26, -7, 28, 1, lite) +
    r(36, -60, 8, 54, wood) + r(37, -60, 2, 54, lite) + r(43, -60, 1, 54, dark)
  // everything above the column sits higher and further right than the clerk's visor
  let up = `<polygon points="28,-55 52,-60 46,-50 34,-49" fill="${wood}" stroke="${dark}" stroke-width="1"/>`
  s +=
    r(26, -27, 28, 3, wood) + r(26, -24, 28, 1, dark) +
    r(29, -36, 5, 9, p.danger) + r(34, -35, 4, 8, p.ok) + r(46, -33, 6, 6, p.accentAlt)
  // the slanted desk board (wide) with the ledger on it
  const spine = grey ? p.ink : p.danger, spineTxt = grey ? p.paper : p.accent
  let top = r(-28, 0, 56, 4, lite, ' stroke="' + dark + '" stroke-width="1"') + r(-26, -2, 52, 3, spine)
  if (mode === 'closed') {
    top += r(-24, -8, 48, 7, spine, INK) + r(-22, -2, 44, 1, p.paper) + r(-24, -8, 48, 2, tint(spine, 0, 0.1)) +
      // label on the shut cover: read every last page
      r(-12, -8.5, 22, 8, p.paper, ' stroke="#000" stroke-width="0.5"') + txt(-10, -2.2, 'FIN.', 7, p.ink) +
      // fat ribbon bookmark hanging over the far right edge
      r(23, -8, 5, 26, p.accent, ' stroke="#000" stroke-width="0.5"') +
      `<polygon points="23,18 28,18 28,22 25.5,19.5 23,22" fill="${p.accent}"/>`
  } else {
    const page = (sx: number) => {
      const x0 = sx > 0 ? 3 : -21
      return `<polygon points="0,-1 0,-9 ${12 * sx},-12 ${24 * sx},-10 ${24 * sx},-1" fill="${p.paper}" stroke="#000" stroke-width="0.5"/>` +
        r(x0, -8, 17, 1, p.smoke) + r(x0, -6, 15, 1, p.smoke) + r(x0, -4, 17, 1, p.smoke)
    }
    top += page(-1) + page(1) + r(-1, -10, 2, 10, p.ink)
    if (mode === 'flip') {
      top += `<g>${spin('scale', '1 1;-1 1;-1 1', 1.4, ph, ' keyTimes="0;0.35;1"')}` +
        `<polygon points="1,0 1,-8 12,-12 23,-10 23,0" fill="#000" opacity="0.25"/>` +
        `<polygon points="0,-1 0,-9 11,-14 22,-12 22,-1" fill="${p.paper}" stroke="${p.ink}" stroke-width="1"/>` +
        r(4, -9, 13, 1, p.smoke) + r(4, -7, 15, 1, p.smoke) + r(4, -5, 13, 1, p.smoke) + '</g>'
      // page counter on the right page ticks over with each flip: p47 -> p48
      top += ['47', '48'].map((n, i) =>
        `<g opacity="${1 - i}">${loop('opacity', i ? '0;1' : '1;0', 2.8, ph, ' calcMode="discrete"')}${txt(12, -1.6, 'p' + n, 4, p.ink)}</g>`).join('')
    }
    top += r(8, -1, 2, 9, p.accentAlt)
  }
  top += r(-26, 3, 52, 9, spine, ' stroke="#000" stroke-width="0.6"')
  top += mode === 'fire'
    ? txt(-17, 10.8, 'RTF', 9, spineTxt) + r(-1, 3.5, 7, 8, p.ink) + r(1, 2, 3, 2, p.ink)
    : txt(-17, 10.8, 'RTFM', 9, spineTxt)
  up += `<g transform="translate(40,-62) rotate(-12)">${top}</g>`
  if (mode === 'closed') {
    up += r(47, -46, 2, 2, p.ink) +
      `<g transform="rotate(4,48,-41)">${r(30, -47, 37, 11, p.paper, INK)}${txt(32, -38.5, 'CLOSED', 7, p.ink)}</g>`
  }
  // candle on a brass dish at the high end
  const flame = (x: number, y: number) =>
    `<circle cx="${x}" cy="${y + 4}" r="7" fill="${p.accentAlt}" opacity="0.15"/>` +
    `<polygon points="${x},${y} ${x - 3},${y + 7} ${x},${y + 10} ${x + 3},${y + 7}" fill="${p.accentAlt}"/>` + r(x - 0.5, y + 5, 1.5, 3, '#fff')
  if (mode === 'fire') {
    // candle knocked over: it did this
    up += r(56, -77, 13, 2, p.accent) + `<g transform="rotate(-78,58,-80)">${r(52, -82, 5, 12, p.paper)}</g>`
    up += `<g>${loop('opacity', '1;0.6;1', 0.3, ph)}` +
      `<polygon points="20,-66 26,-86 30,-72 36,-94 41,-74 47,-88 50,-70" fill="${p.danger}"/>` +
      `<polygon points="26,-68 31,-80 36,-72 41,-84 45,-70" fill="${p.accent}"/></g>` +
      `<g opacity="0.75">${spin('translate', '0,0;-6,-8', 1.8, ph)}${loop('opacity', '0.8;0', 1.8, ph)}` +
      r(28, -94, 14, 8, p.smoke) + r(34, -99, 10, 7, p.smoke) + r(24, -90, 8, 6, p.smoke) + '</g>' +
      [0, 1, 2].map(i => `<g>${spin('translate', `0,0;${(i - 1) * 14},-14`, 0.6, ph + i * 0.2)}${loop('opacity', '1;0', 0.6, ph + i * 0.2)}${r(36, -78, 2, 2, p.accent)}</g>`).join('')
  } else if (mode === 'stub') {
    // the night has passed: candle burned to a stub
    up += r(56, -77, 13, 2, p.accent) + r(60, -81, 5, 4, p.paper) + r(59, -78, 2, 2, p.paper) + flame(62.5, -88)
  } else {
    const flick = mode === 'flip' ? loop('opacity', '1;0.75;1;0.9;1', 0.5, ph) : ''
    up += r(56, -77, 13, 2, p.accent) + r(60, -88, 5, 11, p.paper) + r(60, -88, 5, 2, p.smoke) + r(64, -84, 1, 4, p.paper)
    up += `<g>${flick}${flame(62.5, -97)}</g>`
  }
  return s + `<g transform="translate(2,-5)">${up}</g>`
}

/** The guide worker and its workstation, feet-centre at (w.x, w.y). */
export function guideWorker(w: WorkerView, p: Palette): string {
  const st = w.status
  const seed = w.seed
  const ph = (seed % 17) / 10
  // peach / apricot: warm-ward of Claude orange, lifted, +-6 per seed
  const hue = 8 + (seed % 9)
  const body = tint(p.clawd, hue, 0.1), shade = tint(p.clawdDark, hue, 0.08)
  const grey = p.sceneFilter.includes('grayscale')
  const vh = (seed % 7) - 3
  const visor = grey ? tint(p.ok, 0, -0.62) : tint(p.ok, vh, -0.08)
  const visorEdge = grey ? tint(p.ok, 0, -0.75) : tint(p.ok, vh, -0.25)

  // costume in the sprite frame: headband + a translucent forward brim
  const visorSvg =
    r(-24, -38, 48, 2, visorEdge) +
    `<polygon points="-26,-36 26,-36 33,-32.5 -33,-32.5" fill="${visor}" opacity="0.8"/>` +
    r(-33, -33.5, 66, 1.5, visorEdge) + r(-24, -32, 48, 2, shade, ' opacity="0.45"')
  // sleeve garters with a brass buckle
  let over = r(-31, -25, 8, 3, p.danger) + r(23, -25, 8, 3, p.danger) + r(-28, -25, 2, 3, p.accent) + r(26, -25, 2, 3, p.accent)
  if (st !== 'failed') over = visorSvg + over
  if (seed % 3 === 0) over += r(-21, -19, 7, 6, shade) + r(-20, -18, 1, 1, p.ink) + r(-16, -15, 1, 1, p.ink) // elbow patch
  if (seed % 4 === 1) over += `<path d="M-16,-24 h8 v2 h-8 z M8,-24 h8 v2 h-8 z M-8,-23 h16" stroke="${p.accent}" stroke-width="1" fill="none"/>` // half-moon specs
  else if (seed % 2 && st !== 'failed') over += r(-34, -38, 4, 9, p.paper) + r(-34, -38, 4, 1.5, p.danger) // pencil tucked under the visor
  const quill = (anim: string) =>
    `<g>${anim}<polygon points="27,-22 30,-24 44,-46 39,-47 35,-40" fill="${p.paper}" stroke="${p.smoke}" stroke-width="0.6"/>` +
    `<path d="M28,-22 l-3,4" stroke="${p.ink}" stroke-width="1.5"/></g>`

  let eyes: 'normal' | 'closed' | 'happy' | 'dead' | 'wide' | 'tired' = 'normal'
  let mode: Mode = 'still'
  let stack = books(p, seed, 7, 1, ph)
  let extra = '', fx = '', charT = 'translate(-17,-14) scale(1.1)', charAnim = ''

  if (st === 'working') {
    mode = 'flip'
    stack = books(p, seed, 8, 2, ph, false, true)
    over += quill(spin('rotate', '-12 28 -23;10 28 -23;-12 28 -23', 0.28, ph))
    // sweat off both temples
    fx += `<g>${spin('translate', '0,0;0,12', 0.9, ph)}${loop('opacity', '1;0', 0.9, ph)}` +
      r(-46, -50, 3, 4, '#fff') + r(11, -50, 3, 4, '#fff') + '</g>'
    charAnim = spin('translate', '0,0;0,-1.5;0,0', 0.4, ph, ' additive="sum"')
  } else if (st === 'waiting') {
    eyes = 'tired'
    // pocket watch held up in the right hand, chain looping down to the waistcoat
    over += `<path d="M26,-31 q3,15 -10,17 q-8,1 -12,-4" stroke="${p.accent}" fill="none" stroke-width="1.2"/>` +
      r(18, -44, 13, 13, p.accent, ' stroke="#000" stroke-width="1"') + r(20, -42, 9, 9, p.paper) + r(22, -47, 5, 3, p.accent) +
      r(24, -41, 1.5, 4.5, p.ink) +
      `<g>${spin('rotate', '0 24.5 -37.5;360 24.5 -37.5', 2, ph)}${r(24, -37.5, 1.5, 3.5, p.ink)}</g>` +
      // foot tap: right leg lifts and slaps
      `<g>${spin('translate', '0,0;0,-3;0,0', 0.5, ph)}${r(17, -8, 5, 10, shade)}</g>`
    fx += `<g opacity="0">${loop('opacity', '0;1;0', 0.5, ph, ' calcMode="discrete"')}` +
      `<path d="M10,-12 l-4,-2 M11,-9 h-5 M22,-12 l4,-2" stroke="${p.paper}" stroke-width="1"/></g>` +
      // a clerk's impatience comes out as footnotes
      `<g>${spin('translate', '0,0;0,-3;0,0', 1.2, ph)}<g transform="rotate(-6,-36,-90)">` +
      r(-62, -102, 42, 15, p.paper, INK) + txt(-59, -91, 'ibid.?', 10, p.ink) + '</g>' +
      `<g transform="rotate(5,-12,-76)">${r(-30, -84, 38, 11, p.paper, INK)}${txt(-28, -76, 'see p.47', 7, p.ink)}</g></g>`
    charAnim = spin('rotate', '-1 0 0;1 0 0;-1 0 0', 1.2, ph, ' additive="sum"')
  } else if (st === 'idle') {
    eyes = 'closed'
    mode = 'stub'
    charT = 'translate(-17,-13) scale(1.17,0.9)'
    // drool bubble
    over += `<g>${spin('scale', '1 0.6;1 1.3;1 0.6', 3, ph)}${r(2, -18, 1.5, 9, p.paper, ' opacity="0.85"')}</g>` + r(1.5, -19, 3, 2, p.paper)
    // the quill has rolled off onto the floor
    extra += `<polygon points="12,-1 14,-3 30,-6 30,-3" fill="${p.paper}" stroke="${p.smoke}" stroke-width="0.6"/>` + r(9, -2, 4, 2, p.ink)
    fx += `<g>${spin('translate', '0,0;6,-14', 3, ph)}${loop('opacity', '0;1;1;0', 3, ph)}` +
      ['z', 'z', 'Z'].map((z, i) => txt(-4 + i * 7, -58 - i * 10, z, 10 + i * 3, p.paper, ' stroke="#000" stroke-width="0.5"')).join('') + '</g>'
  } else if (st === 'done') {
    eyes = 'happy'
    mode = 'closed'
    stack = books(p, seed, 7, 0, 0)
    charT = 'translate(-19,-12) rotate(-8) scale(1.1)'
    // tea, pinky out, in the right hand; two lazy steam strands
    over += r(27, -33, 11, 9, p.paper, INK) + r(38, -31, 3, 5, 'none', ' stroke="#000" stroke-width="1"') + r(28, -32, 9, 2, p.accentAlt) +
      r(25, -24, 15, 2, p.paper, ' stroke="#000" stroke-width="0.5"') +
      `<g>${loop('opacity', '0;0.9;0', 2.4, ph)}${spin('translate', '0,0;0,-6', 2.4, ph)}` +
      `<path d="M30,-36 q-2,-3 0,-6 q2,-3 0,-6 M35,-36 q2,-3 0,-6 q-2,-3 0,-6" stroke="${p.paper}" fill="none" stroke-width="1.2"/></g>`
  } else {
    eyes = 'dead'
    mode = 'fire'
    stack = books(p, seed, 3, 0, 0, true) +
      r(-70, -5, 20, 5, p.ok, ' stroke="#000" stroke-width="0.6" transform="rotate(-8,-60,0)"') +
      r(-50, -4, 18, 4, p.accentAlt, ' stroke="#000" stroke-width="0.6" transform="rotate(10,-41,0)"')
    // face-down on the open ledger
    charT = 'translate(-12,-14) rotate(16) scale(1.1)'
    // visor knocked off onto the floor, broken quill beside it
    extra += `<g transform="rotate(-6,0,-2)">${r(-14, -4, 22, 2, visorEdge)}<polygon points="-16,-2 10,-2 14,0 -20,0" fill="${visor}"/></g>` +
      `<polygon points="12,-1 15,-2 22,-8 19,-9" fill="${p.paper}"/><polygon points="24,-1 32,-3 32,-1" fill="${p.paper}"/>`
    fx += `<g>${spin('rotate', '0 2 -62;360 2 -62', 1.6, ph)}${txt(-16, -58, '*', 14, p.accent)}${txt(14, -58, '*', 14, p.accent)}</g>` +
      `<g transform="rotate(-5,-30,-100)">${r(-58, -108, 50, 13, p.paper, INK)}${txt(-55, -98, 'DOCS 404', 8, p.ink)}</g>`
  }

  let target = ''
  if (w.isTarget) {
    if (st !== 'failed') eyes = 'wide'
    charAnim = `<animateTransform attributeName="transform" type="translate" values="0,0;0,0;1,-10;-1,-2;0,0" keyTimes="0;0.58;0.62;0.75;1" ${WHIP_SYNC} additive="sum"/>`
    // a lump popping up through the visor + a red welt on the cheek
    over += r(-5, -44, 10, 4, body) + r(-3, -46, 6, 2, body) + r(-5, -44, 10, 1, '#fff', ' opacity="0.35"') +
      r(-11, -48, 3, 1, '#fff') + r(8, -48, 3, 1, '#fff') + r(-0.5, -52, 1, 3, '#fff') +
      r(15, -20, 8, 4, p.danger) + r(16, -21, 6, 1, p.danger) + r(17, -19, 4, 1, '#fff', ' opacity="0.4"')
    target = ow(16, -86, p) +
      `<g opacity="0"><animateTransform attributeName="transform" type="scale" values="1;1;1.5" keyTimes="0;0.6;1" ${WHIP_SYNC}/><animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.6;0.62;1" ${WHIP_SYNC}/>` +
      r(-50, -48, 3, 5, '#fff') + r(14, -50, 3, 5, '#fff') + r(-14, -66, 3, 5, '#fff') + '</g>'
  }

  const crate =
    r(-43, -14, 52, 14, p.metalDark) + r(-41, -12, 48, 4, p.metal) + r(-41, -6, 48, 4, p.metal) +
    r(-43, -14, 4, 14, p.metalLight) + r(5, -14, 4, 14, p.metalLight)

  const guy = `<g transform="${charT}">${charAnim}${clawd({ x: 0, y: 0, body, shade, ink: p.ink, eyes, over })}</g>`
  const desk = lectern(p, mode, ph, grey)

  return squash(
    `<g transform="translate(${w.x},${w.y})" shape-rendering="crispEdges" font-family="monospace" font-weight="bold">` +
    stack + crate +
    (st === 'failed' ? guy + desk : desk + guy) +
    extra + fx + target +
    `</g>`
  )
}
