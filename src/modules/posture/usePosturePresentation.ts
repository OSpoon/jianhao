import type { usePostureMonitor } from "./usePostureMonitor"
import { computed } from "vue"
import { useI18n } from "vue-i18n"

export type PostureMonitor = ReturnType<typeof usePostureMonitor>

export function usePosturePresentation(monitor: PostureMonitor) {
  const { t } = useI18n()

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

  return {
    isMonitoring,
    isCalibrating,
    startLabel,
  }
}
