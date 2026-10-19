import type { Palette, Role, WorkerView } from '../types.ts'
import { exploreWorker } from './explore.ts'
import { planWorker } from './plan.ts'
import { generalWorker } from './general.ts'
import { reviewWorker } from './review.ts'
import { guideWorker } from './guide.ts'
import { otherWorker } from './other.ts'

export const ROLE_ART: Record<Role, (w: WorkerView, p: Palette) => string> = {
  explore: exploreWorker,
  plan: planWorker,
  general: generalWorker,
  review: reviewWorker,
  guide: guideWorker,
  other: otherWorker,
}
