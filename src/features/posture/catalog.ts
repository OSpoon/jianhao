import type { HealthIssue, Issue } from "./engine/types"
import blinkIcon from "../../../src-tauri/icons/tray/blink.svg"
import headDownIcon from "../../../src-tauri/icons/tray/head-down.svg"
import headForwardIcon from "../../../src-tauri/icons/tray/head-forward.svg"
import headTiltIcon from "../../../src-tauri/icons/tray/head-tilt.svg"
import lookAwayIcon from "../../../src-tauri/icons/tray/look-away.svg"
import shrugIcon from "../../../src-tauri/icons/tray/shrug.svg"
import sideLeanIcon from "../../../src-tauri/icons/tray/side-lean.svg"
import sittingIcon from "../../../src-tauri/icons/tray/sitting.svg"
import slouchIcon from "../../../src-tauri/icons/tray/slouch.svg"
import tooCloseIcon from "../../../src-tauri/icons/tray/too-close.svg"

export type IssueUnit = "%" | "°" | "×" | "s" | "min"

export const ISSUE_LABELS: Record<Issue, string> = {
  tooClose: "距离过近",
  headDown: "低头",
  headTilt: "歪头",
  headForward: "头前伸",
  slouch: "驼背",
  shrug: "耸肩",
  sideLean: "歪坐",
  blink: "眨眼提醒",
  sitting: "久坐提醒",
  lookAway: "远眺提醒",
}

export const ISSUE_VALUES: Record<Issue, string> = {
  tooClose: "12% / 6%",
  headDown: "12° / 6°",
  headTilt: "12° / 6°",
  headForward: "10% / 5%",
  slouch: "1.00× / 0.50×",
  shrug: "8% / 4%",
  sideLean: "1.00× / 0.50×",
  blink: "12 秒",
  sitting: "45 分钟",
  lookAway: "20 分钟",
}

export const ISSUE_UNITS: Record<Issue, IssueUnit> = {
  tooClose: "%",
  headDown: "°",
  headTilt: "°",
  headForward: "%",
  slouch: "×",
  shrug: "%",
  sideLean: "×",
  blink: "s",
  sitting: "min",
  lookAway: "min",
}

export const ISSUE_ICONS: Record<Issue, string> = {
  tooClose: tooCloseIcon,
  headDown: headDownIcon,
  headTilt: headTiltIcon,
  headForward: headForwardIcon,
  slouch: slouchIcon,
  shrug: shrugIcon,
  sideLean: sideLeanIcon,
  blink: blinkIcon,
  sitting: sittingIcon,
  lookAway: lookAwayIcon,
}

export const ISSUE_GROUPS: Array<{ label: string, issues: Issue[] }> = [
  {
    label: "settings.postureGroup",
    issues: ["tooClose", "headDown", "headForward", "slouch", "sideLean", "headTilt", "shrug"],
  },
  { label: "settings.healthGroup", issues: ["sitting", "lookAway", "blink"] },
]

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

export const MENU_BAR_ISSUES: Issue[] = [
  "tooClose",
  "headDown",
  "headForward",
  "slouch",
  "sideLean",
  "headTilt",
  "shrug",
]

export const HEALTH_ISSUE_ORDER: HealthIssue[] = ["sitting", "lookAway", "blink"]

export const FAQ_ITEMS = [
  {
    key: "lookAway",
  },
  {
    key: "sitting",
  },
  {
    key: "blink",
  },
  {
    key: "tooClose",
  },
  {
    key: "privacy",
  },
  {
    key: "calibrate",
  },
] as const
