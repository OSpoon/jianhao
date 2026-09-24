import type { StreamFrameResult } from "./engine/landmarkers"
import type { Baseline, FrameMetrics, Issue, Sensitivity, Verdict } from "./engine/types"
import { useDocumentVisibility, useUserMedia } from "@vueuse/core"
import { onUnmounted, ref, shallowRef, watch } from "vue"
import { i18n } from "@/i18n"
import { POSTURE_ISSUE_ORDER } from "./catalog"
import { Calibrator, loadBaseline, saveBaseline } from "./engine/calibration"
import { cameraConstraints } from "./engine/camera"
import { BLINK_MIN_FPS, CALIBRATION_MS, RULES } from "./engine/config"
import { PostureJudge } from "./engine/judge"
import { Landmarkers, TrackProcessorUnsupportedError } from "./engine/landmarkers"
import { computeMetrics } from "./engine/metrics"
import { loadSensitivity, saveSensitivity } from "./engine/storage"

export type MonitorStatus = "idle" | "loading" | "calibrating" | "running" | "sleeping" | "paused" | "error"

const ACTIVE_FRAME_INTERVAL_MS = 66
const BACKGROUND_FRAME_INTERVAL_MS = 700
const PRESENCE_FRAME_INTERVAL_MS = 1000
const ABSENCE_SLEEP_MS = 60_000
const ISSUE_ORDER: readonly Issue[] = [
  ...POSTURE_ISSUE_ORDER,
  "blink",
  "sitting",
  "lookAway",
]

const t = i18n.global.t

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function describeVerdict(verdict: Verdict, metrics: FrameMetrics | null): string {
  if (verdict.breakLeftMs !== null) {
    return t("runtime.lookAwayCountdown", { seconds: Math.ceil(verdict.breakLeftMs / 1000) })
  }
  if (!verdict.alarm)
    return metrics ? t("runtime.normal") : t("runtime.notDetected")
  const active = ISSUE_ORDER.filter(issue => verdict.issues[issue]?.active)
  return active.length > 0
    ? t("runtime.adjust", { issues: active.map(issue => t(`issue.${issue}`)).join("、") })
    : t("runtime.adjustPosture")
}

export function usePostureMonitor() {
  const documentVisibility = useDocumentVisibility()
  const cameraMedia = useUserMedia({ enabled: false, autoSwitch: false })
  const status = ref<MonitorStatus>("idle")
  const message = ref(t("runtime.ready"))
  const metrics = shallowRef<FrameMetrics | null>(null)
  const verdict = shallowRef<Verdict | null>(null)
  const baseline = shallowRef<Baseline | null>(loadBaseline())
  const sensitivity = ref<Sensitivity>(loadSensitivity())
  const calibrationProgress = ref(0)

  let landmarkers: Landmarkers | null = null
  let judge: PostureJudge | null = baseline.value ? createJudge(baseline.value) : null
  let calibrator: Calibrator | null = null
  let stream: MediaStream | null = null
  let previewVideo: HTMLVideoElement | null = null
  let runToken = 0
  let frameCount = 0
  let fpsWindowStart = performance.now()
  let currentFps = 0
  let absenceSince: number | null = null
  // useUserMedia owns one stream; serialize requests so a canceled permission prompt cannot
  // overwrite a later capture when it eventually resolves.
  let cameraStartQueue: Promise<void> = Promise.resolve()

  function acquireCamera(deviceId: string, token: number): Promise<MediaStream | null> {
    const request = cameraStartQueue.then(async () => {
      if (token !== runToken)
        return null
      if (!cameraMedia.isSupported.value)
        throw new Error("This browser does not support camera access (getUserMedia).")

      cameraMedia.constraints.value = cameraConstraints(deviceId)
      const openedStream = await cameraMedia.start()
      if (token !== runToken) {
        cameraMedia.stop()
        openedStream?.getTracks().forEach(track => track.stop())
        return null
      }
      return openedStream ?? null
    })
    cameraStartQueue = request.then(() => undefined, () => undefined)
    return request
  }

  function createJudge(nextBaseline: Baseline): PostureJudge {
    return new PostureJudge(nextBaseline, RULES, sensitivity.value)
  }

  function isRunning(): boolean {
    return stream !== null && (status.value === "running" || status.value === "calibrating" || status.value === "sleeping")
  }

  function attachPreview(video: HTMLVideoElement | null): void {
    if (previewVideo && previewVideo !== video) {
      previewVideo.pause()
      previewVideo.srcObject = null
    }
    previewVideo = video
    if (!video || !stream || status.value === "sleeping") {
      if (video) {
        video.pause()
        video.srcObject = null
      }
      return
    }

    if (video.srcObject !== stream)
      video.srcObject = stream
    void video.play().catch(() => {
      // A newly mounted preview may need a browser gesture before playback resumes.
    })
  }

  function frameInterval(): number {
    if (status.value === "sleeping")
      return PRESENCE_FRAME_INTERVAL_MS
    return documentVisibility.value !== "visible" ? BACKGROUND_FRAME_INTERVAL_MS : ACTIVE_FRAME_INTERVAL_MS
  }

  function updateFrameInterval(): void {
    landmarkers?.setFrameInterval(frameInterval())
  }

  async function start(cameraDeviceId = ""): Promise<void> {
    if (status.value === "loading")
      return

    const token = ++runToken
    let openedStream: MediaStream | null = null
    status.value = "loading"
    message.value = t("runtime.openingCamera")

    try {
      await landmarkers?.stopTrack()
      if (token !== runToken)
        return

      openedStream = await acquireCamera(cameraDeviceId, token)
      if (token !== runToken) {
        openedStream?.getTracks().forEach(track => track.stop())
        return
      }
      if (!openedStream)
        throw new Error("The selected camera did not provide a video stream")

      const captureTrack = openedStream.getVideoTracks()[0]
      if (!captureTrack)
        throw new Error("The selected camera did not provide a video track")
      const previewTrack = captureTrack.clone()
      stream = new MediaStream([previewTrack])
      attachPreview(previewVideo)

      if (!landmarkers) {
        const onAttempt = (attempt: "GPU" | "CPU") => {
          if (status.value !== "loading")
            return
          message.value = t("runtime.loadingModel", { delegate: attempt })
        }
        const onStreamFrame = (frame: StreamFrameResult) => handleStreamFrame(frame, runToken)
        const onStreamError = (error: Error) => {
          if (isRunning())
            failDetection(error)
        }
        landmarkers = new Landmarkers(onAttempt, onStreamFrame, onStreamError)
      }

      const activeLandmarkers = landmarkers
      try {
        await activeLandmarkers.load()
      }
      catch (error) {
        activeLandmarkers.close()
        if (landmarkers === activeLandmarkers)
          landmarkers = null
        throw error
      }
      if (token !== runToken) {
        openedStream.getTracks().forEach(track => track.stop())
        openedStream = null
        return
      }

      if (token !== runToken) {
        openedStream.getTracks().forEach(track => track.stop())
        openedStream = null
        return
      }

      status.value = "running"
      updateFrameInterval()
      message.value = baseline.value ? t("runtime.monitoring") : t("runtime.calibrateFirst")
      const startTrackPromise = activeLandmarkers.startTrack(captureTrack)
      // The original track is now handed to the worker; only the preview clone remains here.
      openedStream = null
      await startTrackPromise
    }
    catch (error) {
      if (token !== runToken) {
        openedStream?.getTracks().forEach(track => track.stop())
        return
      }
      openedStream?.getTracks().forEach(track => track.stop())
      cameraMedia.stop()
      stream?.getTracks().forEach(track => track.stop())
      stream = null
      if (previewVideo) {
        previewVideo.pause()
        previewVideo.srcObject = null
      }
      landmarkers?.close()
      landmarkers = null
      status.value = "error"
      message.value = error instanceof TrackProcessorUnsupportedError
        ? t("runtime.trackProcessorUnsupported")
        : t("runtime.error", { error: errorMessage(error) })
    }
  }

  function pause(): void {
    runToken += 1
    void landmarkers?.stopTrack()
    cameraMedia.stop()
    calibrator = null
    calibrationProgress.value = 0
    absenceSince = null
    stream?.getTracks().forEach(track => track.stop())
    stream = null
    previewVideo?.pause()
    if (previewVideo)
      previewVideo.srcObject = null
    metrics.value = null
    verdict.value = null
    status.value = "paused"
    message.value = t("runtime.pause")
  }

  function toggle(cameraDeviceId = ""): void {
    if (isRunning())
      pause()
    else if (status.value !== "loading")
      void start(cameraDeviceId)
  }

  function beginCalibration(): void {
    if (status.value !== "running")
      return
    calibrator = new Calibrator(performance.now(), CALIBRATION_MS)
    calibrationProgress.value = 0
    status.value = "calibrating"
    message.value = t("runtime.calibrating")
  }

  function setSensitivity(value: Sensitivity): void {
    sensitivity.value = value
    saveSensitivity(value)
    judge?.setSensitivity(value)
  }

  async function handleStreamFrame(frame: StreamFrameResult, token: number): Promise<void> {
    const activeLandmarkers = landmarkers
    if (token !== runToken || !activeLandmarkers || !isRunning())
      return

    // Use the window's clock for calibration and reminders; worker performance
    // clocks can have a different time origin from the document.
    const now = performance.now()
    try {
      if (frame.mode === "presence") {
        if (status.value !== "sleeping" || !frame.present)
          return

        await activeLandmarkers.resumeFullMode()
        if (token !== runToken || activeLandmarkers !== landmarkers || !isRunning())
          return

        absenceSince = null
        frameCount = 0
        currentFps = 0
        fpsWindowStart = performance.now()
        status.value = "running"
        updateFrameInterval()
        message.value = baseline.value ? t("runtime.returned") : t("runtime.calibrateFirst")
        if (previewVideo && stream) {
          previewVideo.srcObject = stream
          void previewVideo.play().catch(() => undefined)
        }
        return
      }

      if ((status.value !== "running" && status.value !== "calibrating") || !frame.detection)
        return

      const nextMetrics = computeMetrics(frame.detection, frame.width, frame.height)
      trackFps(now)

      if (nextMetrics && (documentVisibility.value !== "visible" || currentFps < BLINK_MIN_FPS)) {
        nextMetrics.eyeClosed = null
      }
      metrics.value = nextMetrics

      if (nextMetrics) {
        absenceSince = null
        if (!baseline.value && status.value === "running")
          beginCalibration()
      }
      else {
        absenceSince ??= now
        if (now - absenceSince >= ABSENCE_SLEEP_MS) {
          status.value = "sleeping"
          message.value = t("runtime.awaySleep")
          calibrator = null
          calibrationProgress.value = 0
          verdict.value = null
          metrics.value = null
          currentFps = 0
          updateFrameInterval()
          previewVideo?.pause()
          if (previewVideo)
            previewVideo.srcObject = null
          await activeLandmarkers.enterLowPowerMode()
          if (token !== runToken || activeLandmarkers !== landmarkers)
            return
          return
        }
      }

      if (calibrator) {
        calibrator.add(nextMetrics)
        calibrationProgress.value = calibrator.progress(now)
        if (calibrator.isDone(now))
          finishCalibration()
        return
      }

      const nextVerdict = judge?.update(nextMetrics, now) ?? null
      verdict.value = nextVerdict
      if (nextVerdict)
        message.value = describeVerdict(nextVerdict, nextMetrics)
    }
    catch (error) {
      if (token === runToken)
        failDetection(error)
    }
  }

  function failDetection(error: unknown): void {
    runToken += 1
    landmarkers?.close()
    landmarkers = null
    cameraMedia.stop()
    stream?.getTracks().forEach(track => track.stop())
    stream = null
    previewVideo?.pause()
    if (previewVideo)
      previewVideo.srcObject = null
    calibrator = null
    status.value = "error"
    message.value = t("runtime.error", { error: errorMessage(error) })
  }

  function finishCalibration(): void {
    if (!calibrator)
      return
    const result = calibrator.finish()
    calibrator = null
    calibrationProgress.value = 1

    if (!result) {
      status.value = "error"
      message.value = t("runtime.calibrationInsufficient")
      return
    }

    baseline.value = result
    saveBaseline(result)
    judge = createJudge(result)
    status.value = "running"
    message.value = t("runtime.calibrationComplete")
  }

  function trackFps(now: number): void {
    frameCount += 1
    if (now - fpsWindowStart < 1000)
      return
    currentFps = (frameCount * 1000) / (now - fpsWindowStart)
    frameCount = 0
    fpsWindowStart = now
  }

  watch(documentVisibility, () => updateFrameInterval())
  onUnmounted(() => {
    runToken += 1
    void landmarkers?.stopTrack()
    stream?.getTracks().forEach(track => track.stop())
    previewVideo?.pause()
    if (previewVideo)
      previewVideo.srcObject = null
    landmarkers?.close()
    landmarkers = null
  })

  return {
    status,
    message,
    metrics,
    verdict,
    baseline,
    sensitivity,
    calibrationProgress,
    attachPreview,
    toggle,
    beginCalibration,
    setSensitivity,
  }
}
