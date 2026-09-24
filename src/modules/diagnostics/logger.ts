import type { PostureIssue } from "@/modules/posture/catalog"
import type { Baseline, FrameMetrics } from "@/modules/posture/engine/types"
import { isTauri } from "@tauri-apps/api/core"
import { info } from "@tauri-apps/plugin-log"
import { POSTURE_ISSUE_ORDER } from "@/modules/posture/catalog"

export interface PostureIssueReading {
  issue: PostureIssue
  value: number | null
  active: boolean
}

export type PostureMeasurements = Omit<FrameMetrics, "eyeClosed" | "points">

type PostureLogEvent
  = | { type: "sample", measurements: PostureMeasurements, issues: readonly PostureIssueReading[] }
    | { type: "transition", activeIssues: readonly PostureIssueReading[] }
    | { type: "baseline", source: "loaded" | "calibrated", baseline: Baseline }

function safeReadings(readings: readonly PostureIssueReading[]): PostureIssueReading[] {
  return readings
    .filter(({ issue }) => POSTURE_ISSUE_ORDER.includes(issue))
    .map(({ issue, value, active }) => ({
      issue,
      value: value !== null && Number.isFinite(value) ? value : null,
      active: Boolean(active),
    }))
}

function safeMetrics(measurements: PostureMeasurements | Baseline) {
  const shoulders = measurements.shoulders
  return {
    ipd: measurements.ipd,
    pitch: measurements.pitch,
    roll: measurements.roll,
    noseY: measurements.noseY,
    faceHeight: measurements.faceHeight,
    shoulders: shoulders
      ? {
          width: shoulders.width,
          tilt: shoulders.tilt,
          midY: shoulders.midY,
          torsoRatio: shoulders.torsoRatio,
          headY: shoulders.headY,
          usesEars: shoulders.usesEars,
          lateral: shoulders.lateral,
          headForward: shoulders.headForward,
        }
      : null,
  }
}

function safeBaseline(baseline: Baseline) {
  return {
    createdAt: baseline.createdAt,
    ...safeMetrics(baseline),
  }
}

export function recordPostureEvent(event: PostureLogEvent): void {
  if (!isTauri())
    return

  let data: Record<string, unknown>
  switch (event.type) {
    case "sample":
      data = {
        measurements: safeMetrics(event.measurements),
        issues: safeReadings(event.issues),
      }
      break
    case "transition":
      data = { activeIssues: safeReadings(event.activeIssues) }
      break
    case "baseline":
      data = { source: event.source, baseline: safeBaseline(event.baseline) }
      break
  }

  const record = JSON.stringify({
    schema: 1,
    domain: "posture",
    type: event.type,
    timestamp: new Date().toISOString(),
    ...data,
  })
  void info(record).catch(() => undefined)
}
