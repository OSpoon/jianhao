import type { IssueUnit } from "./catalog"
import type { Issue } from "./engine/types"
import type { usePostureMonitor } from "./usePostureMonitor"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import {
  HEALTH_ISSUE_ORDER,
  ISSUE_UNITS,
  ISSUE_VALUES,

  POSTURE_ISSUE_ORDER,
} from "./catalog"

export type PostureMonitor = ReturnType<typeof usePostureMonitor>

export function formatIssueValue(value: number, unit: IssueUnit, locale: string = "zh-CN"): string {
  const scale = unit === "%" ? 100 : 1
  const digits = unit === "°" ? 1 : unit === "×" ? 2 : 0
  const suffix = unit === "s" || unit === "min"
    ? locale === "zh-CN" ? (unit === "s" ? " 秒" : " 分钟") : ` ${unit}`
    : unit
  return `${Math.max(0, value * scale).toFixed(digits)}${suffix}`
}

export function usePosturePresentation(monitor: PostureMonitor) {
  const { t, locale } = useI18n()

  function activeIssues(issueOrder: Issue[]): Issue[] {
    return issueOrder.filter(issue => monitor.verdict.value?.issues[issue]?.active)
  }

  const activeTrayIssues = computed(() => activeIssues(POSTURE_ISSUE_ORDER))
  const activeHealthIssues = computed(() => {
    const active = activeIssues(HEALTH_ISSUE_ORDER)
    if (monitor.verdict.value?.breakLeftMs != null && !active.includes("lookAway")) {
      active.push("lookAway")
    }
    return active
  })

  const isMonitoring = computed(
    () =>
      monitor.status.value === "running"
      || monitor.status.value === "calibrating"
      || monitor.status.value === "sleeping",
  )
  const isCalibrating = computed(() => monitor.status.value === "calibrating")
  const startLabel = computed(() => {
    if (monitor.status.value === "loading")
      return t("home.loading")
    if (isMonitoring.value)
      return t("home.pauseMonitoring")
    if (monitor.status.value === "paused")
      return t("home.resumeMonitoring")
    return t("home.startMonitoring")
  })

  function issueReadout(issue: Issue): string {
    const state = monitor.verdict.value?.issues[issue]
    if (!state || state.value === null) {
      return locale.value === "en-US"
        ? ISSUE_VALUES[issue].replace(" 秒", " s").replace(" 分钟", " min")
        : ISSUE_VALUES[issue]
    }
    const unit = ISSUE_UNITS[issue]
    return `${formatIssueValue(state.value, unit, locale.value)} / ${formatIssueValue(state.threshold, unit, locale.value)}`
  }

  function issueCurrentReadout(issue: Issue): string {
    const state = monitor.verdict.value?.issues[issue]
    if (!state || state.value === null)
      return "—"
    return formatIssueValue(state.value, ISSUE_UNITS[issue], locale.value)
  }

  function issueProgress(issue: Issue): number {
    const state = monitor.verdict.value?.issues[issue]
    if (!state || state.value === null || state.threshold <= 0)
      return 0
    return Math.min(100, Math.max(0, (state.value / state.threshold) * 100))
  }

  function primaryTrayIssue(issues: Issue[]): Issue | null {
    function severity(issue: Issue): number {
      const state = monitor.verdict.value?.issues[issue]
      if (!state || state.value === null || state.threshold <= 0)
        return 0
      return Math.max(0, state.value / state.threshold)
    }

    return issues.reduce<Issue | null>((current, candidate) => {
      if (current === null)
        return candidate
      const severityDifference = severity(candidate) - severity(current)
      if (severityDifference > 0.0001)
        return candidate
      if (Math.abs(severityDifference) > 0.0001)
        return current

      const candidateSince = monitor.verdict.value?.issues[candidate]?.activeSince ?? 0
      const currentSince = monitor.verdict.value?.issues[current]?.activeSince ?? 0
      return candidateSince > currentSince ? candidate : current
    }, null)
  }

  function indicatorStatus(): string {
    if (monitor.status.value === "paused" || monitor.status.value === "idle")
      return "paused"
    if (monitor.status.value === "sleeping")
      return "sleeping"
    if (monitor.status.value === "error")
      return "error"
    if (monitor.status.value === "loading" || monitor.status.value === "calibrating")
      return "calibrating"

    if (activeTrayIssues.value.length > 0) {
      const level = monitor.alertLevel.value >= 2 ? "alert" : "watching"
      const primaryIssue = primaryTrayIssue(activeTrayIssues.value)
      const orderedIssues = primaryIssue
        ? [primaryIssue, ...activeTrayIssues.value.filter(issue => issue !== primaryIssue)]
        : activeTrayIssues.value
      const entries = orderedIssues.map(issue => `${issue}@${issueCurrentReadout(issue)}`).join(",")
      return `${level}:${entries}`
    }
    return "normal"
  }

  return {
    activeTrayIssues,
    activeHealthIssues,
    isMonitoring,
    isCalibrating,
    startLabel,
    issueReadout,
    issueProgress,
    indicatorStatus,
  }
}
