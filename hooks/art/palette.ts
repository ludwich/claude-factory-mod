import type { Palette, Theme } from './types.ts'

export const PALETTES: Record<Theme, Palette> = {
  // Brass, soot and gaslight: an 1890s mill.
  victorian: {
    bg: '#3b2a1f', bgDeep: '#24180f', floor: '#5a4030', floorLine: '#3d2b1f',
    metal: '#6b5a48', metalDark: '#3a2f25', metalLight: '#a08a6a',
    accent: '#d4a64a', accentAlt: '#b5651d', ink: '#1e140c', paper: '#efe2c4',
    smoke: '#9c8f80', danger: '#e0483a', ok: '#6f8f3a',
    clawd: '#d97757', clawdDark: '#a8553a', sceneFilter: '',
  },
  // Black-and-white newsreel: silent-film Modern Times. The hall is grayscaled;
  // the Clawds and the red are hand-tinted spot colours (Sin City).
  noir: {
    bg: '#2b2b2b', bgDeep: '#151515', floor: '#3c3c3c', floorLine: '#262626',
    metal: '#5c5c5c', metalDark: '#303030', metalLight: '#9a9a9a',
    accent: '#e8e8e8', accentAlt: '#bdbdbd', ink: '#0d0d0d', paper: '#f2f2f2',
    smoke: '#8a8a8a', danger: '#c8362c', ok: '#b4b4b4',
    clawd: '#c9704f', clawdDark: '#9a4f36', sceneFilter: 'grayscale(1) contrast(1.15)',
  },
  // Cyber sweatshop: neon tubes, rain, synthwave.
  neon: {
    bg: '#120b24', bgDeep: '#07040f', floor: '#1d1238', floorLine: '#ff2bd6',
    metal: '#3b2d6e', metalDark: '#1f1646', metalLight: '#8a74d6',
    accent: '#00f0ff', accentAlt: '#ff2bd6', ink: '#05020c', paper: '#f4ecff',
    smoke: '#9d8ce0', danger: '#ff3860', ok: '#39ff88',
    clawd: '#ff8a5c', clawdDark: '#c4532f', sceneFilter: 'saturate(1.3)',
  },
}
