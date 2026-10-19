// Renders every scenario x theme to SVG + PNG (and the terminal view to text)
// so builders and judges can look at the art. Not loaded by the engine.
//
//   node tools/preview.ts --out preview/mine [--only crew] [--theme neon] [--no-png]
//
// Writes <out>/<scenario>-<theme>.svg/.png, <out>/sheet-<theme>.svg/.png
// (every role x every status), <out>/ascii-<scenario>-<cols>.txt, index.html.
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { renderScene } from '../hooks/art/compose.ts'
import { PALETTES } from '../hooks/art/palette.ts'
import { ROLE_ART } from '../hooks/art/roles/index.ts'
import { asciiScene } from '../hooks/ascii.ts'
import type { Role, Theme, WorkerStatus } from '../hooks/art/types.ts'
import { SCENARIOS, THEMES } from './scenarios.ts'

const args = process.argv.slice(2)
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined }
const out = resolve(opt('--out') ?? 'preview/default')
const only = opt('--only')
const onlyTheme = opt('--theme') as Theme | undefined
const png = !args.includes('--no-png')
mkdirSync(out, { recursive: true })

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
function shoot(svgPath: string, w: number, h: number) {
  if (!png) return
  const pngPath = svgPath.replace(/\.svg$/, '.png')
  const html = svgPath.replace(/\.svg$/, '.shot.html')
  writeFileSync(html, `<html><body style="margin:0;background:#000"><img src="${pathToFileURL(svgPath).href}" width="${w}" height="${h}"></body></html>`)
  if (existsSync(pngPath)) rmSync(pngPath)
  const profile = join(tmpdir(), 'factory-edge-' + out.replace(/[^a-z0-9]/gi, '').slice(-40))
  try {
    execFileSync(EDGE, ['--headless=new', '--disable-gpu', `--user-data-dir=${profile}`, '--hide-scrollbars', `--window-size=${w},${h}`,
      `--screenshot=${pngPath}`, pathToFileURL(html).href], { stdio: 'ignore', timeout: 30000 })
  } catch (err) {
    console.error('screenshot failed', svgPath, String(err))
  }
  // msedge.exe hands off to a child and returns early: wait for the file.
  const until = Date.now() + 20000
  while (!existsSync(pngPath) && Date.now() < until) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200)
  if (!existsSync(pngPath)) console.error('screenshot missing', pngPath)
  else Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300)
}

const files: string[] = []
const themes = onlyTheme ? [onlyTheme] : THEMES
for (const [name, make] of Object.entries(SCENARIOS)) {
  if (only && only !== name && only !== 'sheet') continue
  if (only === 'sheet') break
  for (const t of themes) {
    const v = make(t)
    const svg = renderScene(v)
    const f = `${out}/${name}-${t}.svg`
    writeFileSync(f, svg)
    shoot(f, v.width, v.height)
    files.push(f)
    if (svg.length > 120000) console.warn(`WARNING ${name}-${t}: ${svg.length} chars (limit 131072)`)
    console.log(`${name}-${t}: ${svg.length} chars`)
  }
  for (const cols of [100, 60]) {
    const lines = asciiScene(make('victorian'), cols)
    const text = lines.map(l => l.map(s => s.text).join('')).join('\n')
    const wide = lines.map(l => l.map(s => s.text).join('').length).filter(n => n > cols)
    if (wide.length) console.warn(`WARNING ascii ${name}@${cols}: ${wide.length} lines too wide`)
    writeFileSync(`${out}/ascii-${name}-${cols}.txt`, text)
  }
}

// Role sheet: every role x every status on a plain floor.
if (!only || only === 'sheet') {
  const roles: Role[] = ['explore', 'plan', 'general', 'review', 'guide', 'other']
  const statuses: WorkerStatus[] = ['working', 'waiting', 'idle', 'done', 'failed']
  const CW = 180, RH = 150, W = 120 + CW * statuses.length + 20, H = 40 + RH * roles.length
  for (const t of themes) {
    const p = PALETTES[t]
    let body = `<rect width="${W}" height="${H}" fill="${p.bg}"/>`
    statuses.forEach((s, c) => {
      body += `<text x="${120 + c * CW + CW / 2}" y="24" text-anchor="middle" font-family="monospace" font-size="14" fill="${p.paper}">${s}${c === 0 ? ' (+target)' : ''}</text>`
    })
    roles.forEach((role, r) => {
      body += `<rect y="${40 + r * RH + RH - 30}" width="${W}" height="30" fill="${p.floor}"/>`
      body += `<text x="10" y="${40 + r * RH + RH / 2}" font-family="monospace" font-size="14" fill="${p.paper}">${role}</text>`
      statuses.forEach((s, c) => {
        body += ROLE_ART[role]({
          id: `${role}-${s}`, role, type: role, description: `${role} task`, status: s, tools: 7 + c,
          lastTool: 'Read', isTarget: c === 0, seed: r * 100 + c * 17, x: 120 + c * CW + CW / 2, y: 40 + r * RH + RH - 20,
        }, p)
      })
    })
    const filter = p.sceneFilter ? ` style="filter:${p.sceneFilter}"` : ''
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><g${filter}>${body}</g></svg>`
    const f = `${out}/sheet-${t}.svg`
    writeFileSync(f, svg)
    shoot(f, W, H)
    files.push(f)
    console.log(`sheet-${t}: ${svg.length} chars`)
  }
}

writeFileSync(`${out}/index.html`, `<html><body style="background:#111;color:#eee;font-family:monospace">` +
  files.map(f => `<h3>${f.split(/[\\/]/).pop()}</h3><object data="${pathToFileURL(f).href}" type="image/svg+xml"></object>`).join('') +
  `</body></html>`)
console.log(`wrote ${files.length} drawings to ${out}`)
