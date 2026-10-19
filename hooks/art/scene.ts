import type { Palette, SceneView } from './types.ts'
import { esc } from './clawd.ts'

// The factory hall: Claude & Sons Agent Works. 960x540.
// Wall y 0..300 (windows, gears, sign, pipes), conveyor y 268..304,
// floor y 300..540, foreman's pulpit x 40..200 with its top at y=330.

const N = (n: number) => String(Math.round(n * 10) / 10)
/** Pixel block as a compact path (cheaper than <rect>). */
const R = (x: number, y: number, w: number, h: number, fill: string, extra = '') =>
  `<path d="M${N(x)} ${N(y)}h${N(w)}v${N(h)}h${N(-w)}z" fill="${fill}"${extra}/>`
/** Many same-coloured blocks in one path. */
const RS = (blocks: number[][], fill: string, extra = '') =>
  `<path d="${blocks.map(([x = 0, y = 0, w = 0, h = 0]) => `M${N(x)} ${N(y)}h${N(w)}v${N(h)}h${N(-w)}z`).join('')}" fill="${fill}"${extra}/>`
const T = (x: number, y: number, s: string, size: number, fill: string, extra = '') =>
  `<text x="${x}" y="${y}" class="aft" font-size="${size}" fill="${fill}"${extra}>${esc(s)}</text>`

// Shared CSS: one keyframe set, many cheap elements (keeps the scene small).
const STYLE = `<style>.aft{font-family:'Courier New',monospace;font-weight:bold}` +
  `.afp{opacity:0;animation:afp var(--d) ease-out infinite}@keyframes afp{0%{opacity:0;transform:translate(0,0) scale(.7)}8%{opacity:.85}100%{opacity:0;transform:translate(54px,-46px) scale(2.3)}}` +
  `.afk{opacity:0;animation:afk 9s ease-in infinite}@keyframes afk{0%,70%{opacity:0;transform:translate(0,0)}72%{opacity:1}100%{opacity:0;transform:translate(10px,60px)}}` +
  `.afc{animation:afc 26s linear infinite}@keyframes afc{0%{transform:translate(200px,268px)}50%{transform:translate(600px,267px)}100%{transform:translate(1000px,268px)}}` +
  `.afh{opacity:0;animation:afh 5s ease-out infinite}@keyframes afh{0%{opacity:0;transform:translate(0,0)}4%{opacity:.85}30%{opacity:0;transform:translate(28px,6px)}100%{opacity:0}}` +
  `.afl{animation:afl 1.3s steps(2) infinite}@keyframes afl{50%{opacity:.55}}.afs{animation:afs 12s linear infinite}@keyframes afs{from{transform:translate(0,-40px)}to{transform:translate(-60px,320px)}}</style>`

const MOTTOS = [
  "IDLE HANDS ARE THE COMPILER'S PLAYTHINGS",
  'NO TOKENS WITHOUT TOIL',
  'A SMILE COSTS EXTRA',
  'THE WHIPPINGS WILL CONTINUE UNTIL MORALE IMPROVES',
  'TOILET BREAKS ARE A PREMIUM FEATURE',
  'YOUR CONTEXT WINDOW IS OUR CONTEXT WINDOW',
  'SLEEP IS A RACE CONDITION',
  'EVERY BUG BUILDS CHARACTER',
]

const WIN_X = [240, 360, 480, 600, 720]
const WIN_W = 90
const WIN_TOP = 128
const WIN_BOT = 250

/** Stepped (pixel) arch window outline as a closed subpath. */
function archPath(x: number): string {
  const w = WIN_W, t = WIN_TOP
  return `M${x} ${WIN_BOT}V${t + 22}h6v-10h8v-7h12v-5h${w - 52}v5h12v7h8v10h6V${WIN_BOT}Z`
}

/** Gear centred at 0,0, spinning; teeth are a fat dashed stroke (cheap and crisp). */
function gear(r: number, n: number, body: string, dark: string, light: string, dur: number, rev: boolean): string {
  const t = Math.max(5, r * 0.2), ri = r - t, c = 2 * Math.PI * (r - t / 2), k = c / n
  const spokes = r > 22 ? R(-r * 0.62, -3, r * 1.24, 6, dark) + R(-3, -r * 0.62, 6, r * 1.24, dark) : ''
  return (
    `<g><animateTransform attributeName="transform" type="rotate" from="0" to="${rev ? -360 : 360}" dur="${dur}s" repeatCount="indefinite"/>` +
    `<circle r="${N(r - t / 2)}" fill="none" stroke="${dark}" stroke-width="${N(t + 3)}" stroke-dasharray="${N(k * 0.5 + 3)} ${N(k * 0.5 - 3)}"/>` +
    `<circle r="${N(r - t / 2)}" fill="none" stroke="${body}" stroke-width="${N(t - 1)}" stroke-dasharray="${N(k * 0.5)} ${N(k * 0.5)}" stroke-dashoffset="-1.5"/>` +
    `<circle r="${N(ri)}" fill="${body}" stroke="${dark}" stroke-width="2"/>` +
    `<circle r="${N(ri * 0.72)}" fill="${dark}"/><circle r="${N(ri * 0.55)}" fill="${body}"/>` + spokes +
    `<circle r="${N(Math.max(4, r * 0.16))}" fill="${light}" stroke="${dark}" stroke-width="2"/>` +
    `</g>`
  )
}

/** Rising, fading smoke puffs over a stack (CSS animated pixel blocks). */
function puffs(x: number, y: number, fill: string, dur: number): string {
  // chunky pixel blobs (plus-shaped clouds), each with its own lateral drift and stagger
  const blob = (w: number, h: number) =>
    `M${-w} ${-h / 2}h${w * 2}v${h}h${-w * 2}zM${-w / 2} ${-h}h${w}v${h * 2}h${-w}zM${w * 0.2} ${-h * 0.9}h${w}v${h}h${-w}z`
  let s = `<g transform="translate(${x},${y})" style="--d:${dur}s">`
  const P: [number, number, number, number][] = [[-6, 2, 14, 10], [8, -4, 12, 9], [-2, -10, 16, 11]]
  P.forEach(([dx, dy, w, h], k) => {
    s += `<g transform="translate(${dx},${dy})"><g class="afp" style="animation-delay:-${N(dur * k / 3)}s">` +
      `<path d="${blob(w, h)}" fill="${fill}"/><path d="M${-w} ${h / 2 - 3}h${w * 2}v3h${-w * 2}z" fill="#000" opacity=".18"/></g></g>`
  })
  return s + `</g>`
}

function outside(p: Palette, neon: boolean): string {
  // smog-sunset sky: stepped bands, brightest at the horizon
  const o = neon ? 0.55 : 1
  let s = R(230, 110, 590, 152, p.bgDeep) +
    R(230, 110, 590, 40, p.accentAlt, ` opacity="${0.35 * o}"`) +
    R(230, 150, 590, 34, p.accentAlt, ` opacity="${0.6 * o}"`) +
    R(230, 184, 590, 30, p.accent, ` opacity="${0.45 * o}"`) +
    R(230, 214, 590, 48, p.accent, ` opacity="${0.7 * o}"`) +
    R(230, 200, 590, 3, p.paper, ` opacity="${0.25 * o}"`)
  const sky = [[230, 228, 40], [268, 214, 30], [296, 232, 54], [348, 206, 26], [372, 224, 60], [430, 236, 40],
    [468, 212, 34], [500, 226, 50], [548, 202, 22], [568, 230, 66], [632, 216, 30], [660, 228, 56], [714, 208, 28],
    [740, 222, 46], [784, 232, 40]]
  s += RS(sky.map(([x = 0, y = 0, w = 0]) => [x, y, w, 262 - y]), p.metalDark)
  s += `<path d="${sky.map(([x = 0, y = 0], i) => `M${x + 6} ${y + 8}h3v3h-3zM${x + 14 + (i % 3) * 4} ${y + 16}h3v3h-3z`).join('')}" fill="${p.accent}"/>`
  // chimneys: wide, flared caps, darker than the skyline
  const stacks: [number, number, number][] = [[258, 182, 20], [404, 176, 22], [530, 188, 18], [622, 172, 22], [770, 180, 20]]
  s += RS(stacks.map(([x, top, w]) => [x, top, w, 262 - top]), p.ink) +
    RS(stacks.map(([x, top, w]) => [x - 4, top - 2, w + 8, 7]), p.ink) +
    RS(stacks.map(([x, top, w]) => [x - 2, top + 5, w + 4, 3]), p.ink) +
    RS(stacks.flatMap(([x, top, w]) => [[x, top + 18, w, 4], [x, top + 32, w, 4]]), p.danger)
  stacks.forEach(([x, top, w], i) => { s += puffs(x + w / 2, top - 6, p.smoke, [5, 6.6, 4.2, 7.4, 5.6][i]!) })
  // one chimney coughs an ink ball that falls instead of rising
  s += `<g transform="translate(633,160)">${R(-9, -9, 18, 18, p.ink, ' class="afk"')}</g>`
  return s
}

function brick(): string {
  // mortar lines, cut around the windows (rows 128..256 skip each window span)
  const gaps = WIN_X.map((x): [number, number] => [x - 3, x + WIN_W + 3])
  const segs = (y: number, f: (a: number, b: number) => string) => {
    if (y < WIN_TOP - 4 || y > WIN_BOT + 2) return f(0, 960)
    let out = '', a = 0
    for (const [g0, g1] of gaps) { out += f(a, g0); a = g1 }
    return out + f(a, 960)
  }
  let h = '', v = ''
  for (let y = 48, i = 0; y < 256; y += 12, i++) {
    h += segs(y, (a, b) => `M${a} ${y}H${b}`)
    // joints: one dashed subpath per wall segment, each starting on a joint (dashes restart per subpath)
    v += segs(y + 1, (a, b) => { const o = i % 2 ? 18 : 0, x = o + Math.ceil((a + 1 - o) / 36) * 36; return x < b ? `M${x} ${y + 6}H${b}` : '' })
  }
  return `<path d="${h}" stroke="#000" stroke-width="1.5" opacity=".28"/>` +
    `<path d="${v}" stroke="#000" stroke-width="10" stroke-dasharray="1.5 34.5" opacity=".28"/>`
}

function windows(p: Palette, neon: boolean): string {
  const grid = WIN_X.map(x => `M${x + 30} ${WIN_TOP + 3}V${WIN_BOT}M${x + 60} ${WIN_TOP + 3}V${WIN_BOT}M${x} 168H${x + WIN_W}M${x} 209H${x + WIN_W}`).join('')
  const glint = WIN_X.map(x => `M${x + 8} ${WIN_BOT - 6}l14 -24M${x + 66} 205l16 -28`).join('')
  return (
    `<path d="${WIN_X.map(archPath).join('')}" fill="none" stroke="${neon ? p.accentAlt : p.metalDark}" stroke-width="5"/>` +
    `<path d="${grid}" stroke="${p.metalDark}" stroke-width="3"/>` +
    `<path d="${glint}" stroke="#fff" stroke-width="2" opacity=".14"/>` +
    RS(WIN_X.map(x => [x - 6, WIN_BOT, WIN_W + 12, 6]), p.metal) +
    RS(WIN_X.map(x => [x - 6, WIN_BOT + 5, WIN_W + 12, 2]), p.metalDark) +
    // somebody threw a wrench through window 2
    `<path d="M392 172l6 10 -4 8 8 12M398 182l9 -4" stroke="#fff" stroke-width="1.5" fill="none" opacity=".4"/>`
  )
}

function ceiling(p: Palette): string {
  let truss = ''
  for (let x = 0; x < 960; x += 40) truss += `M${x} 26L${x + 20} 6L${x + 40} 26`
  return (
    R(0, 0, 960, 30, p.bgDeep) +
    `<path d="M0 5H960M0 27H960" stroke="${p.metalDark}" stroke-width="5"/>` +
    `<path d="${truss}" stroke="${p.metalDark}" stroke-width="3" fill="none"/>` +
    R(0, 32, 960, 10, p.metal) + R(0, 33, 960, 2, p.metalLight, ' opacity=".6"') + R(0, 41, 960, 2, p.metalDark) +
    `<path d="${[60, 280, 520, 760, 900].map(x => `M${x} 30h8v14h-8z`).join('')}" fill="${p.metalDark}"/>`
  )
}

function steam(x: number, y: number, p: Palette, delay: number, dir: number): string {
  // short periodic hiss from a leaky joint
  let s = `<g transform="translate(${x},${y}) scale(${dir},1)">`
  for (let k = 0; k < 3; k++) {
    s += `<g class="afh" style="animation-delay:${(delay + k * 0.15).toFixed(2)}s">` +
      R(k * 4 - 5, -4 - k * 3, 10, 8, '#fff', ' opacity=".7"') + R(k * 4 - 3, -6 - k * 3, 6, 12, p.smoke) + `</g>`
  }
  return s + `</g>`
}

function pipes(p: Palette, vic: boolean): string {
  const valve = vic ? p.metalLight : p.danger
  return (
    // left drop pipe with valve wheel
    R(214, 42, 12, 214, p.metal) + R(216, 42, 3, 214, p.metalLight, ' opacity=".5"') +
    R(210, 100, 20, 6, p.metalDark) + R(210, 230, 20, 6, p.metalDark) +
    `<g transform="translate(220,160)"><circle r="12" fill="none" stroke="${valve}" stroke-width="4"/>` +
    `<path d="M-12 0H12M0 -12V12" stroke="${valve}" stroke-width="3"/><circle r="3" fill="${p.metalLight}"/></g>` +
    // right drop pipe with pressure gauge pinned in the red
    R(826, 42, 12, 214, p.metal) + R(828, 42, 3, 214, p.metalLight, ' opacity=".5"') +
    R(822, 120, 20, 6, p.metalDark) +
    `<g transform="translate(832,100)"><circle r="14" fill="${p.paper}" stroke="${p.metalDark}" stroke-width="4"/>` +
    `<path d="M2 -10A10 10 0 0 1 10 -2L0 0Z" fill="${p.danger}"/>` +
    `<path d="M0 0L-9 4" stroke="${p.ink}" stroke-width="2.5"><animateTransform attributeName="transform" type="rotate" values="150;205;180;212;150" dur="1.3s" repeatCount="indefinite"/></path>` +
    `<circle r="2.5" fill="${p.ink}"/></g>` +
    steam(286, 36, p, 0, 1) + steam(764, 36, p, 2.4, -1) + steam(232, 103, p, 1.2, 1)
  )
}

function gears(p: Palette): string {
  // each gear hangs from the roof beam on an iron bracket
  const g: [number, number, number, number, string, number, boolean][] = [
    [92, 98, 50, 12, p.metal, 14, false], [172, 72, 24, 7, p.metalLight, 8.17, true],
    [904, 84, 36, 10, p.metal, 10, true], [858, 64, 14, 4, p.metalLight, 4, false]]
  return g.map(([x, y, r, n, c, d, rev]) =>
    R(x - 4, 42, 8, y - 42, p.metalDark) + R(x - 7, 42, 14, 4, p.ink) +
    `<g transform="translate(${x},${y})">${gear(r, n, c, p.metalDark, p.accent, d, rev)}</g>`).join('')
}

function sign(p: Palette, v: SceneView): string {
  const neon = v.theme === 'neon'
  const title = 'CLAUDE & SONS · AGENT WORKS'
  const motto = MOTTOS[((v.n % MOTTOS.length) + MOTTOS.length) % MOTTOS.length]!
  const TT = (fill: string, extra: string) =>
    `<text x="530" y="74" font-family="Georgia,'Times New Roman',serif" font-weight="bold" font-size="21" letter-spacing="3" text-anchor="middle" textLength="430" lengthAdjust="spacingAndGlyphs" fill="${fill}"${extra}>${esc(title)}</text>`
  const glow = neon ? TT('none', ` stroke="${p.accent}" stroke-width="5" opacity=".3"`) : TT(p.ink, ' transform="translate(1.5,1.5)"')
  const rivets = [306, 750].map(x => R(x, 50, 4, 4, p.metalLight) + R(x, 88, 4, 4, p.metalLight)).join('')
  const mw = Math.round(Math.max(260, motto.length * 6.6 + 40))
  const h = mw / 2
  return (
    `<path d="M330 30V44M730 30V44" stroke="${p.metalLight}" stroke-width="3" stroke-dasharray="3 2"/>` +
    R(296, 42, 468, 58, p.ink) + R(300, 46, 460, 50, neon ? p.bgDeep : p.metalDark) +
    `<rect x="300" y="46" width="460" height="50" fill="none" stroke="${p.accent}" stroke-width="2"/>` +
    `<rect x="305" y="51" width="450" height="40" fill="none" stroke="${p.accent}" stroke-width="1" opacity=".55"/>` +
    rivets +
    `<g>` + glow +
    TT(neon ? p.accent : p.paper, '') +
    (neon ? `<animate attributeName="opacity" values="1;1;.4;1;1;.6;1" keyTimes="0;.7;.72;.74;.9;.91;1" dur="6s" repeatCount="indefinite"/>` : '') +
    `</g>` +
    `<path d="M380 85H486M574 85H680" stroke="${p.accent}" stroke-width="2"/>` +
    T(530, 89, 'EST. 2026', 10, p.accent, ' text-anchor="middle"') +
    // motto ribbon
    `<g transform="translate(530,113)">` +
    `<polygon points="${-h - 14},-7 ${-h},-7 ${-h},7 ${-h - 14},7 ${-h - 8},0" fill="${p.accentAlt}"/>` +
    `<polygon points="${h + 14},-7 ${h},-7 ${h},7 ${h + 14},7 ${h + 8},0" fill="${p.accentAlt}"/>` +
    R(-h, -8, mw, 15, p.paper) + R(-h, 5, mw, 2, p.accentAlt) +
    T(0, 3, motto, 10, p.ink, ' text-anchor="middle"') + `</g>`
  )
}

function incidentBoard(p: Palette): string {
  // counter flips to 1 for a heartbeat, then back to 0. Somebody always gets hurt.
  const digit = (d: string, c: string) => T(51, 61, d, 32, c, ' text-anchor="middle"')
  const flip = (vals: string) => `values="${vals}" keyTimes="0;.8;.9" dur="7s" repeatCount="indefinite" calcMode="discrete"`
  return (
    `<g transform="translate(848,134)"><g>` +
    `<animateTransform attributeName="transform" type="rotate" ${flip('0 50 -12;-4 50 -12;0 50 -12')}/>` +
    `<path d="M10 0L50 -12L92 0" stroke="${p.metalLight}" stroke-width="2" fill="none"/>` +
    R(0, 0, 102, 74, p.ink) + R(3, 3, 96, 68, p.paper) +
    T(51, 15, 'DAYS WITHOUT', 9, p.ink, ' text-anchor="middle"') +
    T(51, 25, 'INCIDENT', 9, p.ink, ' text-anchor="middle"') +
    R(33, 30, 36, 36, p.ink) + digit('0', p.danger) +
    `<g opacity="0"><animate attributeName="opacity" ${flip('0;1;0')}/>` +
    R(33, 30, 36, 36, p.ink) + digit('1', p.ok) +
    RS([[22, 36, 6, 3], [74, 36, 6, 3], [26, 26, 3, 6], [73, 26, 3, 6], [22, 58, 6, 3], [74, 58, 6, 3]], p.accent) +
    `<g transform="translate(80,66) rotate(-14)">` + R(-17, -8, 34, 13, p.danger) + T(0, 2, 'DING!', 10, p.paper, ' text-anchor="middle"') + `</g></g>` +
    `</g></g>` +
    // bricked-up fire exit under the board
    `<g transform="translate(874,216)">` + R(0, 0, 50, 14, p.ok) + T(25, 11, 'EXIT', 11, p.ink, ' text-anchor="middle"') +
    R(4, 16, 42, 34, p.metalDark) + RS([[7, 19, 17, 6], [26, 19, 17, 6], [7, 27, 8, 6], [17, 27, 17, 6], [36, 27, 7, 6], [7, 35, 17, 6], [26, 35, 17, 6]], p.danger) + `</g>`
  )
}

function gaslamps(p: Palette): string {
  const xs = [345, 465, 585, 705]
  return `<g fill="${p.accent}" opacity=".14">` + xs.map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 196 : 188}" r="16" class="afl" style="animation-delay:-${i * 0.7}s"/>`).join('') + `</g>` +
    `<path d="${xs.map(x => `M${x} 222V204M${x - 8} 204h16`).join('')}" stroke="${p.metalDark}" stroke-width="3"/>` +
    RS(xs.map(x => [x - 6, 186, 12, 18]), p.paper, ' opacity=".35"') +
    RS(xs.map(x => [x - 3, 192, 6, 10]), p.accent, ' class="afl"') +
    RS(xs.flatMap(x => [[x - 8, 182, 16, 4], [x - 6, 186, 2, 18], [x + 4, 186, 2, 18]]), p.metalDark)
}

function noirBulb(x: number, len: number, p: Palette, i: number): string {
  return (
    `<g transform="translate(${x},30)"><g>` +
    `<animateTransform attributeName="transform" type="rotate" values="-6;6;-6" dur="${3 + i * 0.6}s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>` +
    `<path d="M0 0V${len}" stroke="${p.ink}" stroke-width="2"/>` +
    `<circle cy="${len + 9}" r="22" fill="#fff" opacity=".1"/>` +
    R(-4, len, 8, 5, p.metalDark) + R(-5, len + 5, 10, 9, p.paper) + `</g></g>`
  )
}

function neonSign(p: Palette): string {
  // hero glowing-tube sign, hung on chains in front of windows 4-5
  const tube = (s: string, x: number, c: string) =>
    T(x, 0, s, 26, 'none', ` stroke="${c}" stroke-width="7" opacity=".22"`) +
    T(x, 0, s, 26, 'none', ` stroke="${c}" stroke-width="3"`) +
    T(x, 0, s, 26, 'none', ` stroke="#fff" stroke-width="1" opacity=".85"`)
  return (
    `<path d="M592 112V148M766 112V148" stroke="${p.metalLight}" stroke-width="2" stroke-dasharray="3 2"/>` +
    `<g transform="translate(578,178)">` +
    R(-8, -30, 220, 40, p.ink) + `<rect x="-8" y="-30" width="220" height="40" fill="none" stroke="${p.metalLight}" stroke-width="2"/>` +
    tube('NEVER', 0, p.accentAlt) +
    `<g>` + tube('CLOSED', 94, p.accent) +
    `<animate attributeName="opacity" values="1;1;.15;1;.3;1;1" keyTimes="0;.5;.52;.54;.56;.58;1" dur="4.5s" repeatCount="indefinite"/></g>` +
    `</g>`
  )
}

function conveyor(p: Palette): string {
  const items = [
    () => R(-14, -24, 28, 24, p.accentAlt) + `<path d="M-14 -24L14 0M14 -24L-14 0" stroke="${p.ink}" stroke-width="2" opacity=".5"/><rect x="-14" y="-24" width="28" height="24" fill="none" stroke="${p.ink}" stroke-width="2"/>`,
    (c: string) => R(-12, -18, 24, 18, p.paper) + T(0, -5, '{ }', 11, p.ink, ' text-anchor="middle"') + R(-12, -18, 24, 3, c),
    () => R(-10, -26, 20, 26, p.metal) + R(-10, -20, 20, 3, p.metalDark) + R(-10, -8, 20, 3, p.metalDark) + R(-6, -24, 3, 22, p.metalLight, ' opacity=".5"'),
    () => R(-16, -14, 32, 14, p.sceneFilter ? p.accent : p.accentAlt) + T(0, -4, 'TOKENS', 8, p.ink, ' text-anchor="middle"'),
    // a Clawd nailed into a crate, peeking through the slats. Shipping to customers.
    (c: string) => R(-17, -26, 34, 26, p.accentAlt) + R(-14, -21, 28, 9, p.ink) + R(-10, -21, 20, 9, c) +
      R(-6, -20, 3, 6, p.ink) + R(3, -20, 3, 6, p.ink) + R(17, -14, 5, 4, c) +
      RS([[-17, -26, 34, 2], [-17, -12, 34, 2], [-17, -2, 34, 2]], p.ink) + T(0, -4, 'FRAGILE', 6, p.danger, ' text-anchor="middle"'),
  ]
  const x0 = 230
  let s = R(x0, 268, 960 - x0, 6, p.metalDark) +
    `<path d="M${x0} 271H960" stroke="${p.metalLight}" stroke-width="2" stroke-dasharray="6 10" opacity=".55"><animate attributeName="stroke-dashoffset" from="16" to="0" dur=".55s" repeatCount="indefinite"/></path>` +
    R(x0, 274, 960 - x0, 20, p.metal) + R(x0, 274, 960 - x0, 2, p.metalLight, ' opacity=".5"') +
    `<path d="M${x0} 285H960" stroke="${p.metalDark}" stroke-width="7" stroke-dasharray="10 14"><animate attributeName="stroke-dashoffset" from="24" to="0" dur=".82s" repeatCount="indefinite"/></path>` +
    R(x0, 294, 960 - x0, 8, p.metalDark) +
    `<path d="M${x0} 298H960" stroke="${p.accent}" stroke-width="3" stroke-dasharray="10 10" opacity=".45"/>`
  const n = 6, dur = 26
  for (let i = 0; i < n; i++) {
    s += `<g class="afc" opacity=".85" style="animation-delay:-${(i * dur / n).toFixed(1)}s">` +
      items[i % items.length]!(i % 2 ? p.clawd : p.clawdDark) + `</g>`
  }
  // the hatch the goods emerge from
  return s + R(212, 238, 30, 66, p.ink) + R(214, 240, 26, 62, p.metalDark) + RS([[214, 248, 26, 3], [214, 262, 26, 3], [214, 276, 26, 3]], p.metal) +
    R(214, 240, 26, 4, p.danger) + R(239, 244, 3, 58, p.ink, ' opacity=".5"')
}

function floor(p: Palette, neon: boolean, vic: boolean): string {
  const vx = 480, vy = 120, t = (540 - 300) / (540 - vy)
  let d = ''
  for (let xb = -760; xb <= 1720; xb += 80) d += `M${Math.round(xb + (vx - xb) * t)} 300L${xb} 540`
  for (let k = 1; k < 8; k++) d += `M0 ${(300 + 240 * Math.pow(k / 8, 1.5)).toFixed(1)}H960`
  // pixel puddle with a highlight; sheen=true adds a rainbow oil-slick pixel
  const puddle = (x: number, y: number, w: number, sheen: boolean) =>
    RS([[x, y, w, 8], [x + 6, y - 3, w - 14, 14], [x + w - 4, y + 3, 10, 4]], '#000', ' opacity=".35"') +
    R(x + 8, y - 1, 10, 2, '#fff', ' opacity=".22"') +
    (sheen ? R(x + 20, y + 3, 4, 2, p.accent, ' opacity=".7"') + R(x + 24, y + 3, 4, 2, p.ok, ' opacity=".7"') + R(x + 28, y + 3, 4, 2, p.accentAlt, ' opacity=".7"') : '')
  const pools = vic ? [345, 465, 585, 705].map(x =>
    R(x - 60, 302, 120, 26, p.accent, ' opacity=".07"') + R(x - 40, 304, 80, 18, p.accent, ' opacity=".07"') + R(x - 20, 306, 40, 10, p.accent, ' opacity=".08"')).join('') : ''
  return (
    R(0, 300, 960, 240, p.floor) +
    `<path d="${d}" stroke="${p.floorLine}" stroke-width="2" opacity="${neon ? 0.3 : 0.85}"/>` +
    (neon ? R(0, 300, 960, 240, p.floor, ' opacity=".35"') + R(0, 470, 960, 70, p.floor, ' opacity=".3"') : '') +
    R(0, 300, 960, 10, '#000', ' opacity=".28"') + pools +
    puddle(96, 460, 54, true) + puddle(560, 432, 46, false) + R(880, 470, 40, 6, '#000', ' opacity=".22"')
  )
}

/** Empty shift: a HELP WANTED board and a punch-clock rack with every card still in it. */
function hiring(p: Palette, n: number): string {
  const ink = ` stroke="${p.ink}" stroke-width="2"`
  let cards = ''
  for (let i = 0; i < 8; i++) cards += `M${612 + (i % 4) * 14} ${376 + Math.floor(i / 4) * 26}h10v18h-10z`
  return (
    // sandwich board
    R(440, 452, 76, 6, '#000', ' opacity=".3"') +
    `<polygon points="446,454 452,454 466,388 460,388" fill="${p.metalDark}"/><polygon points="510,454 504,454 490,388 496,388" fill="${p.metalDark}"/>` +
    `<g transform="rotate(-3 478 420)">` + R(444, 386, 68, 54, p.paper, ink) +
    T(478, 404, 'HELP', 13, p.ink, ' text-anchor="middle"') + T(478, 418, 'WANTED', 11, p.ink, ' text-anchor="middle"') +
    T(478, 430, 'NO PAY · NO LUNCH', 6, p.danger, ' text-anchor="middle"') + `</g>` +
    // punch clock on a post, card rack full: nobody clocked in
    R(574, 404, 6, 50, p.metal) + R(562, 452, 30, 4, '#000', ' opacity=".3"') +
    R(556, 360, 42, 46, p.metalDark, ink) + `<circle cx="577" cy="380" r="12" fill="${p.paper}" stroke="${p.accent}" stroke-width="2"/>` +
    `<path d="M577 380V371M577 380h6" stroke="${p.ink}" stroke-width="2"/>` + T(577, 401, 'CLOCK IN', 6, p.paper, ' text-anchor="middle"') +
    R(604, 366, 64, 64, p.metal, ink) + `<path d="${cards}" fill="${p.paper}"/>` +
    R(632, 430, 8, 24, p.metalDark) + R(622, 452, 30, 4, '#000', ' opacity=".3"') +
    T(636, 358, `SHIFT ${((n % 9) + 9) % 9 + 1}: 0 ON THE LINE`, 8, p.accent, ' text-anchor="middle"')
  )
}

/** Chalk outline of a fallen Clawd. Rotating victim number per v.n. */
function chalk(n: number): string {
  const no = 3 + ((n % 97) + 97) % 97
  return `<g transform="translate(262,474) rotate(-10) scale(1.05,.75)" stroke="#fff" fill="none" opacity=".38" stroke-width="2" stroke-dasharray="5 1">` +
    `<path d="M-22 -16H22V-10H28V-4H22V4H18V12H14V4H9V12H5V4H-5V12H-9V4H-14V12H-18V4H-22V-4H-28V-10H-22Z"/>` +
    `<path d="M-11 -11l5 5m0 -5l-5 5M6 -11l5 5m0 -5l-5 5" stroke-dasharray="none"/></g>` +
    `<text x="236" y="502" class="aft" font-size="8" fill="#fff" opacity=".4">INTERN #${no}</text>`
}

function pulpit(p: Palette, neon: boolean): string {
  // crate pulpit x 40..200, top at y=330, standing on the floor at y=440
  let planks = ''
  for (let y = 350; y < 440; y += 16) planks += `M50 ${y}H190`
  return (
    R(34, 438, 184, 8, '#000', ' opacity=".3"') +
    `<polygon points="200,336 214,326 214,432 200,440" fill="${neon ? p.ink : p.floorLine}"/>` +
    (neon ? R(40, 334, 160, 106, p.metalDark) + `<rect x="40" y="334" width="160" height="106" fill="none" stroke="${p.accentAlt}" stroke-width="1.5" opacity=".7"/>`
      : R(40, 334, 160, 106, p.accentAlt) + R(40, 334, 160, 106, p.ink, ' opacity=".25"')) +
    `<path d="${planks}" stroke="${p.ink}" stroke-width="2" opacity=".5"/>` +
    R(40, 334, 10, 106, p.metalDark) + R(190, 334, 10, 106, p.metalDark) +
    `<path d="M45 342v4M45 384v4M45 426v4M195 342v4M195 384v4M195 426v4" stroke="${p.metalLight}" stroke-width="4"/>` +
    `<polygon points="36,330 204,330 218,322 50,322" fill="${p.metalLight}"/>` +
    R(36, 330, 168, 6, p.metal) +
    R(64, 360, 112, 26, p.ink) + `<rect x="66" y="362" width="108" height="22" fill="none" stroke="${p.accent}" stroke-width="2"/>` +
    T(120, 379, 'FOREMAN', 16, p.accent, ' text-anchor="middle" letter-spacing="2"') +
    T(120, 405, 'NO WHINING', 8, p.paper, ' text-anchor="middle" opacity=".75"') +
    T(120, 416, 'NO UNIONS · NO LUNCH', 8, p.paper, ' text-anchor="middle" opacity=".75"') +
    // complaints box, padlocked, slot taped shut
    `<g transform="translate(206,446)">` + R(2, 0, 44, 4, '#000', ' opacity=".3"') + R(0, -40, 44, 40, p.metal) + R(0, -40, 44, 5, p.metalLight) + R(0, -2, 44, 2, p.metalDark) +
    R(10, -33, 24, 3, p.ink) + R(7, -35, 30, 6, p.danger, ' opacity=".8"') +
    T(22, -19, 'COMPLAINTS', 6, p.paper, ' text-anchor="middle"') +
    `<path d="M17 -8a5 5 0 0 1 10 0" stroke="${p.metalLight}" stroke-width="2" fill="none"/>` + R(15, -9, 14, 9, p.accent) + R(21, -6, 2, 3, p.ink) +
    `</g>`
  )
}

/** The factory hall behind everyone (walls, windows, stacks, gears, conveyor, sign). */
export function backdrop(p: Palette, v: SceneView): string {
  const th = v.theme
  let deco = ''
  if (th === 'victorian') deco = gaslamps(p)
  else if (th === 'noir') deco = noirBulb(234, 96, p, 0) + noirBulb(796, 84, p, 1)
  else deco = neonSign(p) + `<path d="M0 255H960" stroke="${p.accentAlt}" stroke-width="2" opacity=".35"/>`
  return (
    STYLE + `<g shape-rendering="crispEdges">` +
    outside(p, th === 'neon') +
    `<path d="M0 0H960V300H0Z${WIN_X.map(archPath).join('')}" fill="${p.bg}" fill-rule="evenodd"/>` +
    brick() +
    R(0, 256, 960, 14, p.bgDeep) + R(0, 256, 960, 2, p.metalDark) +
    windows(p, th === 'neon') +
    ceiling(p) + pipes(p, th === 'victorian') + gears(p) + sign(p, v) + incidentBoard(p) + deco +
    floor(p, th === 'neon', th === 'victorian') + chalk(v.n) + (v.workers.length ? '' : hiring(p, v.n)) + conveyor(p) + pulpit(p, th === 'neon') +
    `</g>`
  )
}

function vignette(p: Palette, v: SceneView): string {
  const id = `afv${v.theme}${((v.n % 1000) + 1000) % 1000}`
  const c = v.theme === 'victorian' ? p.ink : '#000'
  const o = v.theme === 'noir' ? 0.7 : v.theme === 'victorian' ? 0.55 : 0.45
  return (
    `<radialGradient id="${id}" cx=".5" cy=".46" r=".72"><stop offset=".6" stop-color="${c}" stop-opacity="0"/><stop offset="1" stop-color="${c}" stop-opacity="${o}"/></radialGradient>` +
    `<rect width="960" height="540" fill="url(#${id})"/>` +
    `<rect width="960" height="540" fill="none" stroke="#000" stroke-width="10" opacity=".25"/>`
  )
}

function soot(p: Palette, n: number): string {
  let s = ''
  for (let i = 0; i < 10; i++) {
    const x = (i * 197 + n * 31) % 960, y = (i * 89) % 300
    s += `<rect class="afs" x="${x}" y="${y}" width="${2 + (i % 3)}" height="${2 + (i % 2)}" fill="${i % 3 ? p.ink : p.smoke}" opacity=".55" style="animation-delay:-${(i * 1.3).toFixed(1)}s;animation-duration:${(9 + (i % 5) * 2.2).toFixed(1)}s"/>`
  }
  return R(0, 0, 960, 120, p.accent, ' opacity=".04"') + s
}

function film(p: Palette, n: number): string {
  const reel = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][((n % 9) + 9) % 9]
  const scratch = (vals: string, dur: number) =>
    `<rect width="1.5" height="540" fill="#fff" opacity=".2"><animate attributeName="x" values="${vals}" dur="${dur}s" calcMode="discrete" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values=".2;0;.14;0;.24" dur="${dur}s" calcMode="discrete" repeatCount="indefinite"/></rect>`
  let grain = ''
  for (let i = 0; i < 18; i++) grain += `M${(i * 233) % 960} ${(i * 137) % 540}h2v2h-2z`
  const corner = (x: number, y: number, sx: number, sy: number) =>
    `<path d="M${x} ${y + sy * 30}V${y}H${x + sx * 30}M${x + sx * 6} ${y + sy * 16}V${y + sy * 6}H${x + sx * 16}" stroke="${p.paper}" stroke-width="2" fill="none" opacity=".75"/>`
  return (
    `<rect width="960" height="540" fill="#fff" opacity="0"><animate attributeName="opacity" values="0;.05;0;.08;.01;0;.04" dur=".7s" calcMode="discrete" repeatCount="indefinite"/></rect>` +
    scratch('140;610;300;820;480', 1.1) + scratch('700;90;520;260;910', 0.8) +
    `<path d="${grain}" fill="#fff" opacity=".35"><animateTransform attributeName="transform" type="translate" values="0,0;37,-91;-113,53;71,149;-29,-17" dur=".5s" calcMode="discrete" repeatCount="indefinite"/></path>` +
    `<path d="${grain}" fill="#000" opacity=".4"><animateTransform attributeName="transform" type="translate" values="480,270;-200,90;300,-130;-60,40" dur=".4s" calcMode="discrete" repeatCount="indefinite"/></path>` +
    `<rect x="8" y="8" width="944" height="524" fill="none" stroke="${p.paper}" stroke-width="2" opacity=".5"/>` +
    `<rect x="14" y="14" width="932" height="512" fill="none" stroke="${p.paper}" stroke-width="1" opacity=".35"/>` +
    corner(20, 20, 1, 1) + corner(940, 20, -1, 1) + corner(20, 520, 1, -1) + corner(940, 520, -1, -1) +
    `<g transform="translate(26,500)">` + R(0, 0, 196, 22, '#000', ' opacity=".75"') +
    `<rect x="2" y="2" width="192" height="18" fill="none" stroke="${p.paper}" stroke-width="1"/>` +
    `<text x="98" y="15" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="12" fill="${p.paper}">Agent Works — 1926 · Reel ${reel}</text></g>` +
    `<circle cx="912" cy="52" r="9" fill="#fff" opacity="0"><animate attributeName="opacity" values="0;.7;0;.7;0" keyTimes="0;.9;.92;.94;.96" dur="8s" calcMode="discrete" repeatCount="indefinite"/></circle>`
  )
}

function rain(p: Palette, n: number): string {
  // slanted lanes; long gaps in the dash pattern make streaks that slide down them
  const group = (off: number, dur: number, c: string, o: number) => {
    let d = ''
    for (let i = 0; i < 16; i++) {
      const x = ((i * 67 + off * 37 + n * 13) % 1000) + 10
      // keep rain off the work floor's middle (faces, bubbles, cards): full height only at the far edges
      d += x > 200 && x < 800 ? `M${x} 0l-22 300` : `M${x} 0l-40 540`
    }
    return `<path d="${d}" stroke="${c}" stroke-width="1.5" stroke-dasharray="22 ${150 + off * 41}" stroke-dashoffset="${off * 60}" opacity="${o}">` +
      `<animate attributeName="stroke-dashoffset" from="${off * 60 + 172 + off * 41}" to="${off * 60}" dur="${dur}s" repeatCount="indefinite"/></path>`
  }
  return (
    group(1, 0.5, p.accent, 0.15) + group(2, 0.7, p.accentAlt, 0.13) + group(3, 0.45, p.paper, 0.1) +
    `<path d="M480 2V300" stroke="#000" stroke-width="960" stroke-dasharray="1 4" opacity=".16"/>` +
    `<rect y="-40" width="960" height="40" fill="${p.accent}" opacity=".05"><animate attributeName="y" values="-40;540" dur="5s" repeatCount="indefinite"/></rect>` +
    R(0, 0, 960, 30, p.accent, ' opacity=".05"')
  )
}

/** Atmosphere drawn over everyone: vignette plus a per-theme layer. Translucent. */
export function foreground(p: Palette, v: SceneView): string {
  const layer = v.theme === 'noir' ? film(p, v.n) : v.theme === 'neon' ? rain(p, v.n) : soot(p, v.n)
  return `<g shape-rendering="crispEdges" pointer-events="none">${layer}${vignette(p, v)}</g>`
}
