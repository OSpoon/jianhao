import type { FaceLandmarkerResult, PoseLandmarkerResult } from "@mediapipe/tasks-vision"
import type { Delegate, DetectionMode, LandmarkerWorkerRequest, LandmarkerWorkerResponse } from "./landmarkers"
import {
  FaceLandmarker,
  PoseLandmarker,
} from "@mediapipe/tasks-vision"
import wasmLoaderPath from "@mediapipe/tasks-vision/vision_wasm_module_internal.js?url"
import wasmBinaryPath from "@mediapipe/tasks-vision/vision_wasm_module_internal.wasm?url"
import { MODEL_URLS } from "./config"

interface WorkerContext {
  location: Location
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

async function setMode(mode: DetectionMode): Promise<void> {
  try {
    const delegate = mode === "presence"
      ? await loadPresenceTask()
      : await loadFullTasks()
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

function detect(frame: ImageBitmap, timestampMs: number, mode: DetectionMode): void {
  try {
    if (mode !== activeMode || !face)
      throw new Error(`The posture detection worker is not in ${mode} mode`)

    if (mode === "presence") {
      const presence = face.detectForVideo(frame, timestampMs) as FaceLandmarkerResult
      workerContext.postMessage({ type: "presence", present: presence.faceLandmarks.length > 0 })
      return
    }

    if (!pose)
      throw new Error("The pose detection model is not ready")
    const detection = {
      face: face.detectForVideo(frame, timestampMs),
      pose: pose.detectForVideo(frame, timestampMs) as PoseLandmarkerResult,
    }
    workerContext.postMessage({ type: "detected", detection })
  }
  catch (error) {
    workerContext.postMessage({
      type: "error",
      operation: "detect",
      message: errorMessage(error),
    })
  }
  finally {
    frame.close()
  }
}

workerContext.onmessage = ({ data }) => {
  if (data.type === "load") {
    void loadTasks()
    return
  }
  if (data.type === "set-mode") {
    void setMode(data.mode)
    return
  }
  if (data.type === "detect") {
    detect(data.frame, data.timestampMs, data.mode)
    return
  }

  closing = true
  closeTasks()
  workerContext.postMessage({ type: "closed" })
  workerContext.close()
}
