import type { Ref } from "vue"
import type { Issue } from "@/features/posture/engine/types"
import type { PostureMonitor, usePosturePresentation } from "@/features/posture/usePosturePresentation"
import { invoke } from "@tauri-apps/api/core"
import { onBeforeUnmount, watch } from "vue"
import { saveMenuBarIssues } from "@/features/posture/engine/storage"
import { i18n } from "@/i18n"

type PosturePresentation = ReturnType<typeof usePosturePresentation>

const TRAY_UPDATE_INTERVAL_MS = 400

interface TrayStatusPayload extends Record<string, unknown> {
  status: string
  postureStatus: string
  displayedIssues: Issue[]
  locale: string
}

/** Synchronizes compact status indicators and selected posture issues with the native tray. */
export function useTrayStatus(
  monitor: PostureMonitor,
  presentation: PosturePresentation,
  menuBarIssues: Ref<Issue[]>,
) {
  const t = i18n.global.t
  let pendingPayload: TrayStatusPayload | null = null
  let lastSentSignature = ""
  let trayUpdateTimer: number | null = null
  let lastTrayUpdateAt = 0

  function menuBarPostureStatus(): string {
    switch (monitor.status.value) {
      case "idle":
        return t("runtime.ready")
      case "loading":
        return t("runtime.tray.loading")
      case "calibrating":
        return t("runtime.tray.calibrating")
      case "paused":
        return t("runtime.tray.paused")
      case "sleeping":
        return t("runtime.tray.sleeping")
      case "error":
        return t("runtime.tray.error")
      case "running":
        break
    }

    if (!monitor.baseline.value)
      return t("runtime.calibrateFirst")

    const latestIssue = presentation.activeTrayIssues.value.reduce<Issue | null>(
      (latest, candidate) => {
        if (latest === null)
          return candidate
        const latestSince = monitor.verdict.value?.issues[latest]?.activeSince ?? 0
        const candidateSince = monitor.verdict.value?.issues[candidate]?.activeSince ?? 0
        return candidateSince > latestSince ? candidate : latest
      },
      null,
    )
    if (latestIssue)
      return t(`issue.${latestIssue}`)

    return monitor.metrics.value
      ? t("runtime.tray.normal")
      : t("runtime.notDetected")
  }

  async function flushTrayStatus(): Promise<void> {
    const payload = pendingPayload
    pendingPayload = null
    if (!payload)
      return

    const signature = JSON.stringify(payload)
    if (signature === lastSentSignature)
      return
    lastSentSignature = signature
    lastTrayUpdateAt = Date.now()
    try {
      await invoke("update_status_indicators", payload)
    }
    catch {
      // This is expected when running the Vite preview outside Tauri.
    }
  }

  function updateTrayStatus(): void {
    const payload: TrayStatusPayload = {
      status: presentation.indicatorStatus(),
      postureStatus: menuBarPostureStatus(),
      displayedIssues: [...menuBarIssues.value],
      locale: i18n.global.locale.value,
    }
    if (JSON.stringify(payload) === lastSentSignature) {
      pendingPayload = null
      if (trayUpdateTimer !== null) {
        window.clearTimeout(trayUpdateTimer)
        trayUpdateTimer = null
      }
      return
    }
    pendingPayload = payload

    const wait = Math.max(0, TRAY_UPDATE_INTERVAL_MS - (Date.now() - lastTrayUpdateAt))
    if (wait === 0) {
      void flushTrayStatus()
      return
    }
    if (trayUpdateTimer !== null)
      return
    trayUpdateTimer = window.setTimeout(() => {
      trayUpdateTimer = null
      void flushTrayStatus()
    }, wait)
  }

  function handleMenuBarIssue(issue: Issue, enabled: boolean): void {
    const next = new Set(menuBarIssues.value)
    if (enabled && next.size < 3)
      next.add(issue)
    else if (!enabled)
      next.delete(issue)
    menuBarIssues.value = [...next]
    saveMenuBarIssues(menuBarIssues.value)
    updateTrayStatus()
  }

  onBeforeUnmount(() => {
    if (trayUpdateTimer !== null)
      window.clearTimeout(trayUpdateTimer)
  })

  watch(i18n.global.locale, updateTrayStatus, { immediate: true })
  watch(
    [monitor.status, monitor.message, monitor.verdict, monitor.alertLevel],
    updateTrayStatus,
    { immediate: true },
  )

  return { handleMenuBarIssue }
}
