import type { Ref } from "vue"
import { invoke, isTauri } from "@tauri-apps/api/core"
import { usePreferredReducedMotion } from "@vueuse/core"
import { onBeforeUnmount, watch } from "vue"
import { POSTURE_ALERT_BREATH_PERIOD_MS } from "./alert"

export function usePostureAlertSound(
  isAlertActive: Ref<boolean>,
  isEnabled: Ref<boolean>,
) {
  const preferredMotion = usePreferredReducedMotion()
  let firstPulseTimer: number | undefined
  let repeatPulseTimer: number | undefined

  function playSystemAlertSound(): void {
    if (!isTauri())
      return

    void invoke("play_system_alert_sound").catch(() => undefined)
  }

  function stopAlertSound(): void {
    if (firstPulseTimer !== undefined)
      window.clearTimeout(firstPulseTimer)
    if (repeatPulseTimer !== undefined)
      window.clearInterval(repeatPulseTimer)

    firstPulseTimer = undefined
    repeatPulseTimer = undefined
  }

  function syncAlertSound(): void {
    const shouldPlay
      = isEnabled.value
        && isAlertActive.value
        && preferredMotion.value !== "reduce"

    if (!shouldPlay) {
      stopAlertSound()
      return
    }

    if (firstPulseTimer !== undefined || repeatPulseTimer !== undefined)
      return

    // Start at the visual breath's peak, then repeat once per full cycle.
    firstPulseTimer = window.setTimeout(() => {
      firstPulseTimer = undefined
      playSystemAlertSound()
      repeatPulseTimer = window.setInterval(
        playSystemAlertSound,
        POSTURE_ALERT_BREATH_PERIOD_MS,
      )
    }, POSTURE_ALERT_BREATH_PERIOD_MS / 2)
  }

  function playPreviewFromUserGesture(): void {
    if (isEnabled.value)
      playSystemAlertSound()
  }

  watch(
    [isAlertActive, isEnabled, preferredMotion],
    syncAlertSound,
    { flush: "post" },
  )

  onBeforeUnmount(stopAlertSound)

  return { playPreviewFromUserGesture }
}
