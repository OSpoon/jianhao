import type { HealthIssue, Issue, Sensitivity } from "./types"

/**
 * Small settings persisted in localStorage so a reload keeps the user's choices.
 * Storage may be unavailable (private mode); every accessor degrades to a default.
 */
const KEYS = {
  sensitivity: "posture-guard.sensitivity.v1",
  sound: "posture-guard.sound.v1",
  menuBarIssues: "posture-guard.menu-bar-issues.v1",
  healthNotifications: "posture-guard.health-notifications.v1",
  cameraMirrored: "posture-guard.camera-mirrored.v1",
  mainWindowShown: "posture-guard.main-window-shown.v1",
} as const

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  }
  catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  }
  catch {
    // Non-fatal.
  }
}

const SENSITIVITIES: readonly Sensitivity[] = ["low", "normal", "high"]
const HEALTH_ISSUES: readonly HealthIssue[] = ["sitting", "lookAway", "blink"]

export function loadSensitivity(): Sensitivity {
  const raw = read(KEYS.sensitivity)
  return SENSITIVITIES.find(s => s === raw) ?? "normal"
}

export function saveSensitivity(value: Sensitivity): void {
  write(KEYS.sensitivity, value)
}

export function loadSoundEnabled(): boolean {
  return read(KEYS.sound) !== "off"
}

export function saveSoundEnabled(enabled: boolean): void {
  write(KEYS.sound, enabled ? "on" : "off")
}

const DEFAULT_MENU_BAR_ISSUES: readonly Issue[] = ["headDown", "headForward", "slouch"]
const MENU_BAR_ISSUES: readonly Issue[] = [
  "tooClose",
  "headDown",
  "headForward",
  "slouch",
  "sideLean",
  "headTilt",
  "shrug",
]

export function loadMenuBarIssues(): Issue[] {
  const raw = read(KEYS.menuBarIssues)
  if (!raw)
    return [...DEFAULT_MENU_BAR_ISSUES]
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed))
      return [...DEFAULT_MENU_BAR_ISSUES]
    return [...new Set(parsed.filter((issue): issue is Issue =>
      typeof issue === "string" && MENU_BAR_ISSUES.includes(issue as Issue),
    ))].slice(0, 3)
  }
  catch {
    return [...DEFAULT_MENU_BAR_ISSUES]
  }
}

export function saveMenuBarIssues(issues: readonly Issue[]): void {
  write(KEYS.menuBarIssues, JSON.stringify(issues.slice(0, 3)))
}

export function loadHealthNotifications(): HealthIssue[] {
  const raw = read(KEYS.healthNotifications)
  if (raw === null)
    return [...HEALTH_ISSUES]
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed))
      return [...HEALTH_ISSUES]
    return [...new Set(parsed.filter((issue): issue is HealthIssue =>
      typeof issue === "string" && HEALTH_ISSUES.includes(issue as HealthIssue),
    ))]
  }
  catch {
    return [...HEALTH_ISSUES]
  }
}

export function saveHealthNotifications(issues: readonly HealthIssue[]): void {
  write(KEYS.healthNotifications, JSON.stringify(issues))
}

export function loadCameraMirrored(): boolean {
  const saved = read(KEYS.cameraMirrored)
  return saved === null ? true : saved === "on"
}

export function saveCameraMirrored(enabled: boolean): void {
  write(KEYS.cameraMirrored, enabled ? "on" : "off")
}

export function loadMainWindowShown(): boolean {
  return read(KEYS.mainWindowShown) === "yes"
}

export function saveMainWindowShown(): void {
  write(KEYS.mainWindowShown, "yes")
}
