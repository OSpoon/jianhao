import type { Baseline, FrameMetrics, Issue, Sensitivity, Verdict } from "./engine/types"
import { onUnmounted, ref, shallowRef, watch } from "vue"
import { i18n } from "@/i18n"
import { POSTURE_ISSUE_ORDER } from "./catalog"
import { Calibrator, loadBaseline, saveBaseline } from "./engine/calibration"
import { openCamera, releaseWakeLock, requestCameraProfile, requestWakeLock } from "./engine/camera"
import { BLINK_MIN_FPS, CALIBRATION_MS, RULES } from "./engine/config"
import { PostureJudge } from "./engine/judge"
import { Landmarkers } from "./engine/landmarkers"
import { computeMetrics } from "./engine/metrics"
import {
  loadSensitivity,
  loadSoundEnabled,
  saveSensitivity,
  saveSoundEnabled,
} from "./engine/storage"
import { usePostureAlerts } from "./usePostureAlerts"

export type MonitorStatus = "idle" | "loading" | "calibrating" | "running" | "sleeping" | "paused" | "error"

const ACTIVE_TICK_MS = 66
const BACKGROUND_TICK_MS = 700
const SLEEP_TICK_MS = 1000
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
  const separator = i18n.global.locale.value === "zh-CN" ? "、" : ", "
  return active.length > 0
    ? t("runtime.adjust", { issues: active.map(issue => t(`issue.${issue}`)).join(separator) })
    : t("runtime.adjustPosture")
}

export function usePostureMonitor() {
  const status = ref<MonitorStatus>("idle")
  const message = ref(t("runtime.ready"))
  const fps = ref(0)
  const delegate = ref<"GPU" | "CPU" | null>(null)
  const metrics = shallowRef<FrameMetrics | null>(null)
  const verdict = shallowRef<Verdict | null>(null)
  const baseline = shallowRef<Baseline | null>(loadBaseline())
  const sensitivity = ref<Sensitivity>(loadSensitivity())
  const soundEnabled = ref(loadSoundEnabled())
  const alerts = usePostureAlerts(soundEnabled)
  const { alertLevel, alertMessage } = alerts
  const calibrationProgress = ref(0)

  let landmarkers: Landmarkers | null = null
  let judge: PostureJudge | null = baseline.value ? createJudge(baseline.value) : null
  let calibrator: Calibrator | null = null
  let stream: MediaStream | null = null
  let activeVideo: HTMLVideoElement | null = null
  let previewVideo: HTMLVideoElement | null = null
  let timer: number | null = null
  let runToken = 0
  let frameCount = 0
  let fpsWindowStart = performance.now()
  let currentFps = 0
  let absenceSince: number | null = null

  watch(i18n.global.locale, () => {
    if (verdict.value) {
      message.value = describeVerdict(verdict.value, metrics.value)
      return
    }
    if (status.value === "idle") {
      message.value = t("runtime.ready")
    }
    else if (status.value === "loading") {
      message.value = delegate.value
        ? t("runtime.loadingModel", { delegate: delegate.value })
        : t("runtime.openingCamera")
    }
    else if (status.value === "calibrating") {
      message.value = t("runtime.calibrating")
    }
    else if (status.value === "paused") {
      message.value = t("runtime.pause")
    }
    else if (status.value === "sleeping") {
      message.value = t("runtime.awaySleep")
    }
  })

  function createJudge(nextBaseline: Baseline): PostureJudge {
    const nextJudge = new PostureJudge(nextBaseline, RULES, sensitivity.value)
    return nextJudge
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

  async function start(video: HTMLVideoElement): Promise<void> {
    if (timer !== null || status.value === "loading")
      return

    const token = ++runToken
    let openedStream: MediaStream | null = null
    alerts.resumeAudio()
    delegate.value = null
    status.value = "loading"
    message.value = t("runtime.openingCamera")

    try {
      activeVideo = video
      openedStream = await openCamera()
      if (token !== runToken) {
        openedStream.getTracks().forEach(track => track.stop())
        return
      }
      stream = openedStream
      video.srcObject = stream
      await video.play()
      if (token !== runToken)
        return
      if (previewVideo) {
        previewVideo.srcObject = stream
        void previewVideo.play().catch(() => undefined)
      }

      if (!landmarkers) {
        landmarkers = new Landmarkers((attempt) => {
          if (status.value !== "loading")
            return
          delegate.value = attempt
          message.value = t("runtime.loadingModel", { delegate: attempt })
        })
      }

      const activeLandmarkers = landmarkers
      try {
        delegate.value = await activeLandmarkers.load()
      }
      catch (error) {
        activeLandmarkers.close()
        if (landmarkers === activeLandmarkers)
          landmarkers = null
        throw error
      }
      if (token !== runToken)
        return

      await requestWakeLock()
      if (token !== runToken)
        return
      status.value = "running"
      timer = window.setTimeout(() => void runScheduledTick(token), ACTIVE_TICK_MS)
      message.value = baseline.value ? t("runtime.monitoring") : t("runtime.calibrateFirst")
    }
    catch (error) {
      if (token !== runToken) {
        openedStream?.getTracks().forEach(track => track.stop())
        return
      }
      stream?.getTracks().forEach(track => track.stop())
      stream = null
      activeVideo = null
      video.pause()
      video.srcObject = null
      if (previewVideo)
        previewVideo.srcObject = null
      status.value = "error"
      message.value = t("runtime.error", { error: errorMessage(error) })
    }
  }

  function pause(video: HTMLVideoElement | null = activeVideo): void {
    runToken += 1
    if (timer !== null)
      window.clearTimeout(timer)
    timer = null
    void releaseWakeLock()
    calibrator = null
    calibrationProgress.value = 0
    absenceSince = null
    alerts.resetForPause()
    stream?.getTracks().forEach(track => track.stop())
    stream = null
    activeVideo = null
    video?.pause()
    if (video)
      video.srcObject = null
    previewVideo?.pause()
    if (previewVideo)
      previewVideo.srcObject = null
    metrics.value = null
    verdict.value = null
    status.value = "paused"
    message.value = t("runtime.pause")
  }

  function toggle(video: HTMLVideoElement | null): void {
    if (isRunning())
      pause(video)
    else if (video)
      void start(video)
  }

  function beginCalibration(): void {
    if (status.value !== "running")
      return
    calibrator = new Calibrator(performance.now(), CALIBRATION_MS)
    calibrationProgress.value = 0
    alertLevel.value = 0
    status.value = "calibrating"
    message.value = t("runtime.calibrating")
  }

  function setSensitivity(value: Sensitivity): void {
    sensitivity.value = value
    saveSensitivity(value)
    judge?.setSensitivity(value)
  }

  function setSoundEnabled(enabled: boolean): void {
    soundEnabled.value = enabled
    saveSoundEnabled(enabled)
    if (enabled)
      alerts.resumeAudio()
    else alerts.handleSoundDisabled()
  }

  function nextTickDelay(): number {
    if (status.value === "sleeping")
      return SLEEP_TICK_MS
    return document.hidden ? BACKGROUND_TICK_MS : ACTIVE_TICK_MS
  }

  async function runScheduledTick(token: number): Promise<void> {
    if (token !== runToken)
      return
    timer = null
    if (activeVideo)
      await tick(activeVideo, token)
    if (token === runToken && stream && status.value !== "paused" && status.value !== "error") {
      timer = window.setTimeout(() => void runScheduledTick(token), nextTickDelay())
    }
  }

  async function tick(video: HTMLVideoElement, token: number): Promise<void> {
    if (!landmarkers || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)
      return

    const activeLandmarkers = landmarkers
    let frame: ImageBitmap | null = null
    try {
      frame = await createImageBitmap(video)
      if (token !== runToken || activeLandmarkers !== landmarkers || !isRunning())
        return

      const now = performance.now()

      if (status.value === "sleeping") {
        const present = await activeLandmarkers.detectPresence(frame, now)
        frame = null
        if (token !== runToken || activeLandmarkers !== landmarkers || !isRunning())
          return

        if (present) {
          const [, , resumedDelegate] = await Promise.all([
            requestCameraProfile(stream, "monitoring"),
            requestWakeLock(),
            activeLandmarkers.resumeFullMode(),
          ])
          if (token !== runToken || activeLandmarkers !== landmarkers)
            return

          absenceSince = null
          delegate.value = resumedDelegate
          frameCount = 0
          currentFps = 0
          fps.value = 0
          fpsWindowStart = performance.now()
          status.value = "running"
          message.value = baseline.value ? t("runtime.returned") : t("runtime.calibrateFirst")
          if (previewVideo && stream) {
            previewVideo.srcObject = stream
            void previewVideo.play().catch(() => undefined)
          }
        }
        return
      }

      const width = frame.width
      const height = frame.height
      const detectionPromise = activeLandmarkers.detect(frame, now)
      frame = null
      const raw = await detectionPromise
      if (token !== runToken || activeLandmarkers !== landmarkers || !isRunning())
        return

      const nextMetrics = computeMetrics(raw, width, height)
      trackFps(now)

      if (nextMetrics && (document.hidden || currentFps < BLINK_MIN_FPS)) {
        nextMetrics.eyeClosed = null
      }
      metrics.value = nextMetrics

      if (nextMetrics) {
        absenceSince = null
      }
      else {
        absenceSince ??= now
        if (now - absenceSince >= ABSENCE_SLEEP_MS) {
          status.value = "sleeping"
          message.value = t("runtime.awaySleep")
          calibrator = null
          calibrationProgress.value = 0
          verdict.value = null
          alerts.updateAlert(null, now)
          metrics.value = null
          fps.value = 0
          currentFps = 0
          previewVideo?.pause()
          if (previewVideo)
            previewVideo.srcObject = null
          const [, , lowPowerDelegate] = await Promise.all([
            requestCameraProfile(stream, "presence"),
            releaseWakeLock(),
            activeLandmarkers.enterLowPowerMode(),
          ])
          if (token !== runToken || activeLandmarkers !== landmarkers)
            return
          delegate.value = lowPowerDelegate
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
      alerts.updateAlert(nextVerdict, now)
      if (nextVerdict)
        message.value = describeVerdict(nextVerdict, nextMetrics)
    }
    catch (error) {
      if (token === runToken)
        failDetection(error)
    }
    finally {
      frame?.close()
    }
  }

  function failDetection(error: unknown): void {
    runToken += 1
    if (timer !== null)
      window.clearTimeout(timer)
    timer = null
    void releaseWakeLock()
    landmarkers?.close()
    landmarkers = null
    stream?.getTracks().forEach(track => track.stop())
    stream = null
    activeVideo?.pause()
    if (activeVideo)
      activeVideo.srcObject = null
    activeVideo = null
    previewVideo?.pause()
    if (previewVideo)
      previewVideo.srcObject = null
    calibrator = null
    alertLevel.value = 0
    alertMessage.value = ""
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
    alerts.updateAlert(null, performance.now())
  }

  function trackFps(now: number): void {
    frameCount += 1
    if (now - fpsWindowStart < 1000)
      return
    currentFps = (frameCount * 1000) / (now - fpsWindowStart)
    fps.value = currentFps
    frameCount = 0
    fpsWindowStart = now
  }

  onUnmounted(() => {
    runToken += 1
    if (timer !== null)
      window.clearTimeout(timer)
    stream?.getTracks().forEach(track => track.stop())
    activeVideo?.pause()
    activeVideo?.srcObject && (activeVideo.srcObject = null)
    previewVideo?.pause()
    if (previewVideo)
      previewVideo.srcObject = null
    landmarkers?.close()
    landmarkers = null
    void releaseWakeLock()
    void alerts.dispose()
  })

  return {
    status,
    message,
    fps,
    delegate,
    metrics,
    verdict,
    baseline,
    sensitivity,
    soundEnabled,
    calibrationProgress,
    isRunning,
    start,
    attachPreview,
    pause,
    toggle,
    beginCalibration,
    setSensitivity,
    setSoundEnabled,
    snoozeAlert: alerts.snoozeAlert,
    dismissAlert: alerts.dismissAlert,
    alertLevel,
    alertMessage,
    issueOrder: ISSUE_ORDER,
  }
}
