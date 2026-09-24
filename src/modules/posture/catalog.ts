import type { Issue } from "./engine/types"

export type PostureIssue = Exclude<Issue, "blink" | "sitting" | "lookAway">

export const POSTURE_ISSUE_ORDER: PostureIssue[] = [
  "tooClose",
  "headDown",
  "headTilt",
  "headForward",
  "slouch",
  "shrug",
  "sideLean",
]
