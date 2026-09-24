import type { PostureIssueReading } from "./logger"
import type { Verdict } from "@/modules/posture/engine/types"
import type { usePostureMonitor } from "@/modules/posture/usePostureMonitor"
import { onBeforeUnmount, onMounted, watch } from "vue"
import { POSTURE_ISSUE_ORDER } from "@/modules/posture/catalog"
import { recordPostureEvent } from "./logger"

type Monitor = ReturnType<typeof usePostureMonitor>

const SAMPLE_INTERVAL_MS = 30_000

function toIssueReadings(verdict: Verdict, activeOnly = false): PostureIssueReading[] {
  return POSTURE_ISSUE_ORDER.flatMap((issue) => {
    const state = verdict.issues[issue]
    if (activeOnly && !state.active)
      return []
    return [{ issue, value: state.value, active: state.active }]
  })
}

/** Records posture-only samples and transitions; it deliberately excludes app/settings events. */
export function usePostureLogging(monitor: Monitor): void {
  let sampleTimer: number | null = null
  let previousActiveSignature = ""

  onMounted(() => {
    sampleTimer = window.setInterval(() => {
      const verdict = monitor.verdict.value
      const frame = monitor.metrics.value
      if (monitor.status.value !== "running" || !verdict || !frame)
        return

      recordPostureEvent({
        type: "sample",
        measurements: frame,
        issues: toIssueReadings(verdict),
      })
    }, SAMPLE_INTERVAL_MS)
  })

  onBeforeUnmount(() => {
    if (sampleTimer !== null)
      window.clearInterval(sampleTimer)
  })

  watch(monitor.baseline, (baseline) => {
    if (baseline)
      recordPostureEvent({ type: "baseline", source: "calibrated", baseline })
  })

  watch(monitor.verdict, (verdict) => {
    if (!verdict || monitor.status.value !== "running") {
      previousActiveSignature = ""
      return
    }

    const activeIssues = toIssueReadings(verdict, true)
    const signature = activeIssues.map(({ issue }) => issue).join(",")
    if (signature === previousActiveSignature)
      return

    previousActiveSignature = signature
    recordPostureEvent({ type: "transition", activeIssues })
  })

  if (monitor.baseline.value) {
    recordPostureEvent({ type: "baseline", source: "loaded", baseline: monitor.baseline.value })
  }
}
