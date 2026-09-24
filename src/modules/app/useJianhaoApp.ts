import type { Ref } from "vue"
import type { CameraFrameShape } from "@/modules/posture/engine/storage"
import type { Sensitivity } from "@/modules/posture/engine/types"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { useDevicesList, useEventListener } from "@vueuse/core"
import { computed, onMounted, ref, watch } from "vue"
import { i18n } from "@/i18n"
import { usePostureLogging } from "@/modules/diagnostics/usePostureLogging"
import {
  loadAlwaysOnTop,
  loadCameraDeviceId,
  loadCameraFrameShape,
  loadCameraMirrored,
  saveAlwaysOnTop,
  saveCameraDeviceId,
  saveCameraFrameShape,
  saveCameraMirrored,
} from "@/modules/posture/engine/storage"
import { PostureOverlay } from "@/modules/posture/overlay"
import { usePostureMonitor } from "@/modules/posture/usePostureMonitor"
import { usePosturePresentation } from "@/modules/posture/usePosturePresentation"

export function useJianhaoApp(
  previewVideoRef: Ref<HTMLVideoElement | null>,
  canvasRef: Ref<HTMLCanvasElement | null>,
) {
  const monitor = usePostureMonitor()
  const presentation = usePosturePresentation(monitor)
  usePostureLogging(monitor)
  const t = i18n.global.t
  const cameraMirrored = ref(loadCameraMirrored())
  const { devices: mediaDevices, videoInputs } = useDevicesList()
  const cameraDevices = computed(() => videoInputs.value.map(({ deviceId, label }) => ({ deviceId, label })))
  const cameraDeviceId = ref(loadCameraDeviceId())
  const cameraFrameShape = ref<CameraFrameShape>(loadCameraFrameShape())
  const alwaysOnTop = ref(loadAlwaysOnTop())
  const windowControlFeedback = ref("")

  let overlay: PostureOverlay | null = null

  async function refreshCameraDevices(): Promise<void> {
    try {
      // Refresh after getUserMedia grants access so device names become available.
      mediaDevices.value = await navigator.mediaDevices?.enumerateDevices() ?? []
    }
    catch {
      mediaDevices.value = []
    }
  }

  function handleStart(): void {
    monitor.toggle(cameraDeviceId.value)
  }

  function handleCameraDeviceChange(deviceId: string): void {
    cameraDeviceId.value = deviceId
    saveCameraDeviceId(deviceId)
  }

  function handleVideoReady(video: HTMLVideoElement | null): void {
    previewVideoRef.value = video
    monitor.attachPreview(video)
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

  function handleCameraFrameShape(shape: CameraFrameShape): void {
    cameraFrameShape.value = shape
    saveCameraFrameShape(shape)
  }

  async function handleAlwaysOnTop(enabled: boolean): Promise<void> {
    try {
      await getCurrentWindow().setAlwaysOnTop(enabled)
      alwaysOnTop.value = enabled
      saveAlwaysOnTop(enabled)
      windowControlFeedback.value = ""
    }
    catch {
      windowControlFeedback.value = t("settings.windowControlFailed")
    }
  }

  async function handleMinimizeWindow(): Promise<void> {
    try {
      await getCurrentWindow().minimize()
    }
    catch {
      windowControlFeedback.value = t("settings.windowControlFailed")
    }
  }

  async function handleCloseWindow(): Promise<void> {
    try {
      await getCurrentWindow().close()
    }
    catch {
      windowControlFeedback.value = t("settings.windowControlFailed")
    }
  }

  function handleSensitivity(value: Sensitivity): void {
    monitor.setSensitivity(value)
  }

  function drawOverlay(): void {
    if (!previewVideoRef.value || !canvasRef.value || !overlay)
      return
    if (previewVideoRef.value.videoWidth > 0 && previewVideoRef.value.videoHeight > 0) {
      overlay.resize(previewVideoRef.value.videoWidth, previewVideoRef.value.videoHeight)
    }
    overlay.draw(monitor.metrics.value, monitor.verdict.value)
  }

  useEventListener(previewVideoRef, "loadedmetadata", drawOverlay)

  onMounted(() => {
    document.title = t("app.windowTitle")

    void (async () => {
      try {
        const currentWindow = getCurrentWindow()
        await currentWindow.setTitle(t("app.windowTitle"))
        await currentWindow.setAlwaysOnTop(alwaysOnTop.value)
      }
      catch {
        windowControlFeedback.value = t("settings.windowControlFailed")
      }
    })()
  })

  watch(monitor.status, (status) => {
    if (status === "running")
      void refreshCameraDevices()
  })

  watch([monitor.metrics, monitor.verdict], drawOverlay)

  return {
    previewVideoRef,
    canvasRef,
    monitor,
    ...presentation,
    cameraMirrored,
    cameraDevices,
    cameraDeviceId,
    cameraFrameShape,
    alwaysOnTop,
    windowControlFeedback,
    handleStart,
    handleCameraDeviceChange,
    handleVideoReady,
    handleCanvasReady,
    handleCalibrate,
    handleCameraMirror,
    handleCameraFrameShape,
    handleAlwaysOnTop,
    handleMinimizeWindow,
    handleCloseWindow,
    handleSensitivity,
  }
}
