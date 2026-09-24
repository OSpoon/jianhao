import type { FaceLandmarkerResult, PoseLandmarkerResult } from "@mediapipe/tasks-vision"
import type { Delegate, DetectionMode, LandmarkerWorkerRequest, LandmarkerWorkerResponse, RawDetection, StreamFrameResult } from "./landmarkers"
import {
  FaceLandmarker,
  PoseLandmarker,
} from "@mediapipe/tasks-vision"
import wasmLoaderPath from "@mediapipe/tasks-vision/vision_wasm_module_internal.js?url"
import wasmBinaryPath from "@mediapipe/tasks-vision/vision_wasm_module_internal.wasm?url"
import { MODEL_URLS } from "./config"

interface TrackProcessorLike {
  readable: ReadableStream<VideoFrame>
}

interface WorkerContext {
  location: Location
  MediaStreamTrackProcessor?: new (options: { track: MediaStreamTrack, maxBufferSize?: number }) => TrackProcessorLike
  onmessage: ((event: MessageEvent<LandmarkerWorkerRequest>) => void) | null
  postMessage: (message: LandmarkerWorkerResponse) => void
  close: () => void
}

const workerContext = globalThis as unknown as WorkerContext
let face: FaceLandmarker | null = null
let pose: PoseLandmarker | null = null
let loading = false
let closing = false
let loaderInstance = 0
let activeMode: DetectionMode | null = null
let activeDelegate: Delegate | null = null
let captureTrack: MediaStreamTrack | null = null
let trackReader: ReadableStreamDefaultReader<VideoFrame> | null = null
let pumpPromise: Promise<void> | null = null
let frameIntervalMs = 66
let nextFrameId = 0
let pendingFrameAck: { frameId: number, resolve: () => void } | null = null

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function closeTasks(): void {
  try {
    face?.close()
  }
  catch {
    // Best effort cleanup when initialization only partially succeeded.
  }
  try {
    pose?.close()
  }
  catch {
    // Best effort cleanup when initialization only partially succeeded.
  }
  face = null
  pose = null
  activeMode = null
  activeDelegate = null
}

function createVisionFileset() {
  // MediaPipe clears the global factory after each task is initialized. Give
  // every task/attempt a unique module URL so the browser doesn't reuse the
  // already-evaluated module from its ESM import cache.
  const loaderUrl = new URL(wasmLoaderPath, workerContext.location.href)
  loaderUrl.searchParams.set("instance", String(++loaderInstance))
  return { wasmLoaderPath: loaderUrl.href, wasmBinaryPath }
}

async function loadFullTasks(): Promise<Delegate> {
  if (closing)
    throw new Error("The posture detection worker is closing")
  if (loading)
    throw new Error("A posture detection model transition is already in progress")
  if (face && pose && activeMode === "full" && activeDelegate)
    return activeDelegate

  loading = true
  closeTasks()

  try {
    for (const delegate of ["GPU", "CPU"] as const) {
      if (closing)
        throw new Error("The posture detection worker is closing")
      workerContext.postMessage({ type: "attempt", delegate })

      let nextFace: FaceLandmarker | null = null
      let nextPose: PoseLandmarker | null = null
      try {
        nextFace = await FaceLandmarker.createFromOptions(createVisionFileset(), {
          baseOptions: { modelAssetPath: MODEL_URLS.face, delegate },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFacialTransformationMatrixes: true,
          outputFaceBlendshapes: true,
        })
        if (closing) {
          nextFace.close()
          throw new Error("The posture detection worker is closing")
        }

        nextPose = await PoseLandmarker.createFromOptions(createVisionFileset(), {
          baseOptions: { modelAssetPath: MODEL_URLS.pose, delegate },
          runningMode: "VIDEO",
          numPoses: 1,
        })
        if (closing) {
          nextFace.close()
          nextPose.close()
          throw new Error("The posture detection worker is closing")
        }

        face = nextFace
        pose = nextPose
        activeMode = "full"
        activeDelegate = delegate
        return delegate
      }
      catch (error) {
        try {
          nextFace?.close()
        }
        catch {
          // Ignore cleanup errors and preserve the initialization failure.
        }
        try {
          nextPose?.close()
        }
        catch {
          // Ignore cleanup errors and preserve the initialization failure.
        }
        console.warn(`Failed to create landmarkers with ${delegate} delegate`, error)
        if (closing || delegate === "CPU")
          throw error
      }
    }
    throw new Error("Could not initialize posture detection models")
  }
  finally {
    loading = false
  }
}

async function loadPresenceTask(): Promise<Delegate> {
  if (closing)
    throw new Error("The posture detection worker is closing")
  if (loading)
    throw new Error("A posture detection model transition is already in progress")

  loading = true
  closeTasks()
  let nextFace: FaceLandmarker | null = null

  try {
    nextFace = await FaceLandmarker.createFromOptions(createVisionFileset(), {
      baseOptions: { modelAssetPath: MODEL_URLS.face, delegate: "CPU" },
      runningMode: "VIDEO",
      numFaces: 1,
    })
    if (closing) {
      nextFace.close()
      throw new Error("The posture detection worker is closing")
    }

    face = nextFace
    activeMode = "presence"
    activeDelegate = "CPU"
    return "CPU"
  }
  catch (error) {
    try {
      nextFace?.close()
    }
    catch {
      // Preserve the presence model initialization failure.
    }
    closeTasks()
    throw error
  }
  finally {
    loading = false
  }
}

async function loadTasks(): Promise<void> {
  if (loading || face || closing)
    return
  try {
    const delegate = await loadFullTasks()
    if (!closing)
      workerContext.postMessage({ type: "loaded", delegate })
  }
  catch (error) {
    if (!closing) {
      workerContext.postMessage({
        type: "error",
        operation: "load",
        message: errorMessage(error),
      })
    }
  }
}

async function applyCaptureProfile(mode: DetectionMode): Promise<void> {
  const track = captureTrack
  if (!track || track.readyState !== "live")
    return

  const size = mode === "presence" ? 320 : 640
  const frameRate = mode === "presence" ? 1 : 15
  try {
    await track.applyConstraints({
      width: { ideal: size, max: size },
      height: { ideal: mode === "presence" ? 240 : 480, max: mode === "presence" ? 240 : 480 },
      frameRate: { ideal: frameRate, max: frameRate },
    })
  }
  catch {
    try {
      await track.applyConstraints({
        width: { ideal: size },
        height: { ideal: mode === "presence" ? 240 : 480 },
        frameRate: { ideal: frameRate },
      })
    }
    catch {
      // Capture profile hints are best effort; unsupported cameras keep their current settings.
    }
  }
}

async function setMode(mode: DetectionMode): Promise<void> {
  try {
    const delegate = mode === "presence"
      ? await loadPresenceTask()
      : await loadFullTasks()
    await applyCaptureProfile(mode)
    if (!closing)
      workerContext.postMessage({ type: "mode-ready", mode, delegate })
  }
  catch (error) {
    if (!closing) {
      workerContext.postMessage({
        type: "error",
        operation: "mode",
        message: errorMessage(error),
      })
    }
  }
}

function infer(frame: VideoFrame, mode: DetectionMode, timestampMs: number): RawDetection | boolean {
  if (mode !== activeMode || !face)
    throw new Error(`The posture detection worker is not in ${mode} mode`)

  if (mode === "presence") {
    const presence = face.detectForVideo(frame, timestampMs) as FaceLandmarkerResult
    return presence.faceLandmarks.length > 0
  }

  if (!pose)
    throw new Error("The pose detection model is not ready")
  return {
    face: face.detectForVideo(frame, timestampMs),
    pose: pose.detectForVideo(frame, timestampMs) as PoseLandmarkerResult,
  }
}

function waitForFrameAck(frameId: number): Promise<void> {
  return new Promise((resolve) => {
    pendingFrameAck = { frameId, resolve }
  })
}

async function pumpFrames(track: MediaStreamTrack, reader: ReadableStreamDefaultReader<VideoFrame>): Promise<void> {
  let lastProcessedAt = -Infinity
  let failureReported = false
  try {
    while (true) {
      if (closing || captureTrack !== track)
        break
      const { done, value: frame } = await reader.read()
      if (done)
        break
      if (captureTrack !== track) {
        frame.close()
        break
      }

      const timestampMs = performance.now()
      if (timestampMs - lastProcessedAt < frameIntervalMs) {
        frame.close()
        continue
      }

      const frameId = ++nextFrameId
      const width = frame.displayWidth || frame.codedWidth
      const height = frame.displayHeight || frame.codedHeight
      try {
        const result = infer(frame, activeMode ?? "full", timestampMs)
        const response: StreamFrameResult = {
          mode: activeMode ?? "full",
          frameId,
          timestampMs,
          width,
          height,
          ...(typeof result === "boolean" ? { present: result } : { detection: result }),
        }
        frame.close()
        lastProcessedAt = timestampMs
        workerContext.postMessage({ type: "stream-detected", frame: response })
        await waitForFrameAck(frameId)
      }
      catch (error) {
        frame.close()
        if (!closing && captureTrack === track) {
          failureReported = true
          workerContext.postMessage({
            type: "error",
            operation: "detect",
            message: errorMessage(error),
          })
        }
        break
      }
    }
  }
  catch (error) {
    if (!closing && captureTrack === track) {
      failureReported = true
      workerContext.postMessage({
        type: "error",
        operation: "track",
        message: errorMessage(error),
      })
    }
  }
  finally {
    try {
      reader.releaseLock()
    }
    catch {
      // The reader may already have been canceled.
    }
    if (captureTrack === track) {
      captureTrack = null
      trackReader = null
      track.stop()
      if (!closing && !failureReported) {
        workerContext.postMessage({
          type: "error",
          operation: "track",
          message: "The camera track ended while posture monitoring was active",
        })
      }
    }
  }
}

async function startTrack(track: MediaStreamTrack): Promise<void> {
  const Processor = workerContext.MediaStreamTrackProcessor
  if (!Processor) {
    track.stop()
    workerContext.postMessage({
      type: "track-unavailable",
      reason: "unsupported",
      message: "MediaStreamTrackProcessor is unavailable in this Web Worker",
    })
    return
  }
  if (!face || activeMode !== "full") {
    track.stop()
    workerContext.postMessage({
      type: "track-unavailable",
      reason: "start",
      message: "The posture detection model is not ready",
    })
    return
  }

  try {
    const processor = new Processor({ track, maxBufferSize: 1 })
    const reader = processor.readable.getReader()
    captureTrack = track
    trackReader = reader
    workerContext.postMessage({ type: "track-started" })
    const currentPump = pumpFrames(track, reader)
    pumpPromise = currentPump
    void currentPump.finally(() => {
      if (pumpPromise === currentPump)
        pumpPromise = null
    })
  }
  catch (error) {
    track.stop()
    workerContext.postMessage({
      type: "track-unavailable",
      reason: "start",
      message: errorMessage(error),
    })
  }
}

async function stopTrack(notify = true): Promise<void> {
  const track = captureTrack
  const reader = trackReader
  captureTrack = null
  trackReader = null
  pendingFrameAck?.resolve()
  pendingFrameAck = null

  try {
    await reader?.cancel()
  }
  catch {
    // The camera may already have ended its stream.
  }
  track?.stop()
  try {
    await pumpPromise
  }
  catch {
    // Pump errors have already been reported to the main thread.
  }
  if (notify && !closing)
    workerContext.postMessage({ type: "track-stopped" })
}

async function closeWorker(): Promise<void> {
  await stopTrack(false)
  closeTasks()
  workerContext.postMessage({ type: "closed" })
  workerContext.close()
}

workerContext.postMessage({
  type: "capabilities",
  trackProcessor: typeof workerContext.MediaStreamTrackProcessor === "function",
})

workerContext.onmessage = ({ data }) => {
  if (data.type === "load") {
    void loadTasks()
    return
  }
  if (data.type === "set-mode") {
    void setMode(data.mode)
    return
  }
  if (data.type === "start-track") {
    void startTrack(data.track)
    return
  }
  if (data.type === "stop-track") {
    void stopTrack()
    return
  }
  if (data.type === "set-frame-interval") {
    frameIntervalMs = Math.max(0, Math.min(5000, data.intervalMs))
    return
  }
  if (data.type === "frame-ack") {
    if (pendingFrameAck?.frameId === data.frameId) {
      pendingFrameAck.resolve()
      pendingFrameAck = null
    }
    return
  }

  closing = true
  void closeWorker()
}
