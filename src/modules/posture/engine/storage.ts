import type { Sensitivity } from "./types"

/**
 * Small settings persisted in localStorage so a reload keeps the user's choices.
 * Storage may be unavailable (private mode); every accessor degrades to a default.
 */
const KEYS = {
  sensitivity: "posture-guard.sensitivity.v1",
  cameraMirrored: "posture-guard.camera-mirrored.v1",
  cameraDeviceId: "jianhao.camera-device-id.v1",
  cameraFrameShape: "jianhao.camera-frame-shape.v1",
  alwaysOnTop: "jianhao.window-always-on-top.v1",
} as const

export type CameraFrameShape = "rounded" | "circle"

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  }
  catch {
    return null
  }
}

function write(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  }
  catch {
    return false
  }
}

const SENSITIVITIES: readonly Sensitivity[] = ["low", "normal", "high"]
export function loadSensitivity(): Sensitivity {
  const raw = read(KEYS.sensitivity)
  return SENSITIVITIES.find(s => s === raw) ?? "normal"
}

export function saveSensitivity(value: Sensitivity): void {
  write(KEYS.sensitivity, value)
}

export function loadCameraMirrored(): boolean {
  const saved = read(KEYS.cameraMirrored)
  return saved === null ? true : saved === "on"
}

export function saveCameraMirrored(enabled: boolean): void {
  write(KEYS.cameraMirrored, enabled ? "on" : "off")
}

export function loadCameraDeviceId(): string {
  return read(KEYS.cameraDeviceId) ?? ""
}

export function saveCameraDeviceId(deviceId: string): void {
  write(KEYS.cameraDeviceId, deviceId)
}

export function loadCameraFrameShape(): CameraFrameShape {
  const saved = read(KEYS.cameraFrameShape)
  return saved === "circle" ? saved : "rounded"
}

export function saveCameraFrameShape(shape: CameraFrameShape): void {
  write(KEYS.cameraFrameShape, shape)
}

export function loadAlwaysOnTop(): boolean {
  return read(KEYS.alwaysOnTop) !== "off"
}

export function saveAlwaysOnTop(enabled: boolean): void {
  write(KEYS.alwaysOnTop, enabled ? "on" : "off")
}
