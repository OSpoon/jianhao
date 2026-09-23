import type { Ref } from "vue"
import type { Issue, Verdict } from "./engine/types"
import { ref } from "vue"
import { i18n } from "@/i18n"
import { HEALTH_ISSUE_ORDER, POSTURE_ISSUE_ORDER } from "./catalog"
import { BEEP_INTERVAL_MS } from "./engine/config"

export type AlertLevel = 0 | 1 | 2 | 3

const EDGE_ALERT_MS = 8_000
const STICKER_ALERT_MS = 15_000
const t = i18n.global.t

/** Owns posture alert timing, snoozing, and optional audio independently of frame processing. */
export function usePostureAlerts(soundEnabled: Readonly<Ref<boolean>>) {
  const alertLevel = ref<AlertLevel>(0)
  const alertMessage = ref("")

  let snoozedUntil = 0
  let dismissedUntilRecovery = false
  let audioContext: AudioContext | null = null
  let lastBeepAt = 0
  let previousHealthIssues = new Set<Issue>()

  function resumeAudio(): void {
    if (!soundEnabled.value || typeof AudioContext === "undefined")
      return
    try {
      audioContext ??= new AudioContext()
      if (audioContext.state === "suspended")
        void audioContext.resume()
    }
    catch {
      // Audio is optional; browsers may deny an audio context outside a user gesture.
    }
  }

  function playTone(frequency: number, volume: number, duration: number): void {
    resumeAudio()
    if (!audioContext || audioContext.state !== "running")
      return

    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const startedAt = audioContext.currentTime

    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(frequency, startedAt)
    gain.gain.setValueAtTime(0.0001, startedAt)
    gain.gain.exponentialRampToValueAtTime(volume, startedAt + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + duration)
    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(startedAt)
    oscillator.stop(startedAt + duration)
  }

  function playAlertBeep(now: number): void {
    if (!soundEnabled.value || alertLevel.value === 0 || now - lastBeepAt < BEEP_INTERVAL_MS)
      return
    lastBeepAt = now
    playTone(
      alertLevel.value >= 2 ? 620 : 520,
      alertLevel.value >= 3 ? 0.055 : 0.035,
      alertLevel.value >= 3 ? 0.2 : 0.14,
    )
  }

  function updateHealthReminderSound(nextVerdict: Verdict | null, now: number): void {
    const activeIssues = HEALTH_ISSUE_ORDER.filter(issue => nextVerdict?.issues[issue]?.active)
    const newlyActive = activeIssues.filter(issue => !previousHealthIssues.has(issue))
    previousHealthIssues = new Set(activeIssues)
    if (newlyActive.length === 0 || !soundEnabled.value || now - lastBeepAt < 250)
      return

    lastBeepAt = now
    playTone(720, 0.028, 0.18)
  }

  function updateAlert(nextVerdict: Verdict | null, now: number): void {
    updateHealthReminderSound(nextVerdict, now)
    if (!nextVerdict) {
      alertLevel.value = 0
      alertMessage.value = ""
      lastBeepAt = 0
      return
    }

    const activePostureIssues = POSTURE_ISSUE_ORDER.filter(issue => nextVerdict.issues[issue]?.active)
    if (activePostureIssues.length === 0) {
      dismissedUntilRecovery = false
      alertLevel.value = 0
      alertMessage.value = ""
      lastBeepAt = 0
      return
    }

    const separator = i18n.global.locale.value === "zh-CN" ? "、" : ", "
    alertMessage.value = t("runtime.adjust", {
      issues: activePostureIssues.map(issue => t(`issue.${issue}`)).join(separator),
    })

    if (dismissedUntilRecovery || snoozedUntil > now) {
      alertLevel.value = 0
      return
    }

    const earliestActiveSince = activePostureIssues
      .map(issue => nextVerdict.issues[issue]?.activeSince)
      .filter((value): value is number => value !== null && value !== undefined)
      .sort((a, b) => a - b)[0]
    const duration = earliestActiveSince === undefined ? 0 : now - earliestActiveSince
    alertLevel.value = duration >= STICKER_ALERT_MS ? 3 : duration >= EDGE_ALERT_MS ? 2 : 1
    playAlertBeep(now)
  }

  function snoozeAlert(durationMs = 20 * 60_000): void {
    snoozedUntil = Date.now() + durationMs
    alertLevel.value = 0
  }

  function dismissAlert(): void {
    dismissedUntilRecovery = true
    alertLevel.value = 0
  }

  function resetForPause(): void {
    alertLevel.value = 0
    alertMessage.value = ""
    lastBeepAt = 0
    previousHealthIssues.clear()
  }

  function handleSoundDisabled(): void {
    if (!soundEnabled.value)
      lastBeepAt = 0
  }

  async function dispose(): Promise<void> {
    await audioContext?.close()
    audioContext = null
  }

  return {
    alertLevel,
    alertMessage,
    dismissAlert,
    dispose,
    handleSoundDisabled,
    resetForPause,
    resumeAudio,
    snoozeAlert,
    updateAlert,
  }
}
