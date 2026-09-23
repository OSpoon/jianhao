import type { Ref } from "vue"
import type { Sensitivity } from "@/features/posture/engine/types"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { useSystemSettings } from "@/features/app/useSystemSettings"
import { useTrayStatus } from "@/features/app/useTrayStatus"
import { usePostureLogging } from "@/features/diagnostics/usePostureLogging"
import {
  loadCameraMirrored,
  loadMainWindowShown,
  loadMenuBarIssues,
  saveCameraMirrored,
  saveMainWindowShown,
} from "@/features/posture/engine/storage"
import { PostureOverlay } from "@/features/posture/overlay"
import { usePostureMonitor } from "@/features/posture/usePostureMonitor"
import { usePosturePresentation } from "@/features/posture/usePosturePresentation"
import { i18n } from "@/i18n"

export function useJianhaoApp(
  sourceVideoRef: Ref<HTMLVideoElement | null>,
  previewVideoRef: Ref<HTMLVideoElement | null>,
  canvasRef: Ref<HTMLCanvasElement | null>,
) {
  const router = useRouter()
  const monitor = usePostureMonitor()
  const presentation = usePosturePresentation(monitor)
  usePostureLogging(monitor)
  const systemSettings = useSystemSettings(presentation.activeHealthIssues, monitor.status)
  const t = i18n.global.t
  const menuBarIssues = ref(loadMenuBarIssues())
  const cameraMirrored = ref(loadCameraMirrored())
  const { handleMenuBarIssue } = useTrayStatus(monitor, presentation, menuBarIssues)

  let overlay: PostureOverlay | null = null
  let removeTrayListener: (() => void) | null = null
  let removeHomeListener: (() => void) | null = null
  let removeSettingsListener: (() => void) | null = null

  function handleStart(): void {
    monitor.toggle(sourceVideoRef.value)
  }

  async function handleTrayToggle(): Promise<void> {
    const isActive = ["running", "calibrating", "sleeping"].includes(monitor.status.value)
    if (!isActive && !loadMainWindowShown()) {
      try {
        await router.push({ name: "home" })
        const appWindow = getCurrentWindow()
        await appWindow.show()
        await appWindow.setFocus()
        saveMainWindowShown()
        await nextTick()
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      }
      catch {
        // If showing the window fails, still attempt to start so the user gets an error state.
      }
    }
    handleStart()
  }

  function handleVideoReady(video: HTMLVideoElement | null): void {
    previewVideoRef.value?.removeEventListener("loadedmetadata", drawOverlay)
    previewVideoRef.value = video
    monitor.attachPreview(video)
    video?.addEventListener("loadedmetadata", drawOverlay)
  }

  function handleCanvasReady(canvas: HTMLCanvasElement | null): void {
    canvasRef.value = canvas
    overlay = canvas ? new PostureOverlay(canvas) : null
    drawOverlay()
  }

  function handleCalibrate(): void {
    monitor.beginCalibration()
  }

  function handleCameraMirror(enabled: boolean): void {
    cameraMirrored.value = enabled
    saveCameraMirrored(enabled)
  }

  function handleSensitivity(value: Sensitivity): void {
    monitor.setSensitivity(value)
  }

  function handleSound(enabled: boolean): void {
    monitor.setSoundEnabled(enabled)
  }

  function drawOverlay(): void {
    if (!previewVideoRef.value || !canvasRef.value || !overlay)
      return
    if (previewVideoRef.value.videoWidth > 0 && previewVideoRef.value.videoHeight > 0) {
      overlay.resize(previewVideoRef.value.videoWidth, previewVideoRef.value.videoHeight)
    }
    overlay.draw(monitor.metrics.value, monitor.verdict.value)
  }

  onMounted(() => {
    void listen("tray://toggle-monitor", () => {
      void handleTrayToggle()
    }).then((unlisten) => {
      removeTrayListener = unlisten
    }).catch(() => undefined)
    void listen("tray://open-home", () => {
      saveMainWindowShown()
      void router.push({ name: "home" })
    }).then((unlisten) => {
      removeHomeListener = unlisten
    }).catch(() => undefined)
    void listen("tray://open-settings", () => {
      saveMainWindowShown()
      void router.push({ name: "settings" })
    }).then((unlisten) => {
      removeSettingsListener = unlisten
    }).catch(() => undefined)
  })

  onBeforeUnmount(() => {
    previewVideoRef.value?.removeEventListener("loadedmetadata", drawOverlay)
    removeTrayListener?.()
    removeHomeListener?.()
    removeSettingsListener?.()
  })
  watch(i18n.global.locale, (locale) => {
    document.title = t("app.windowTitle")
    void getCurrentWindow().setTitle(t("app.windowTitle")).catch(() => undefined)
    void invoke("set_tray_locale", { locale }).catch(() => undefined)
  }, { immediate: true })

  watch([monitor.metrics, monitor.verdict], drawOverlay)

  return {
    sourceVideoRef,
    previewVideoRef,
    canvasRef,
    monitor,
    ...presentation,
    menuBarIssues,
    cameraMirrored,
    handleStart,
    handleVideoReady,
    handleCanvasReady,
    handleCalibrate,
    handleCameraMirror,
    handleSensitivity,
    handleSound,
    handleMenuBarIssue,
    ...systemSettings,
  }
}
