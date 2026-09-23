import type { FaceLandmarkerResult, PoseLandmarkerResult } from "@mediapipe/tasks-vision"

export type Delegate = "GPU" | "CPU"
export type DetectionMode = "full" | "presence"

export interface RawDetection {
  face: FaceLandmarkerResult
  pose: PoseLandmarkerResult
}

export type LandmarkerWorkerRequest
  = | { type: "load" }
    | { type: "set-mode", mode: DetectionMode }
    | { type: "detect", mode: DetectionMode, frame: ImageBitmap, timestampMs: number }
    | { type: "close" }

export type LandmarkerWorkerResponse
  = | { type: "attempt", delegate: Delegate }
    | { type: "loaded", delegate: Delegate }
    | { type: "mode-ready", mode: DetectionMode, delegate: Delegate }
    | { type: "detected", detection: RawDetection }
    | { type: "presence", present: boolean }
    | { type: "error", operation: "load" | "detect" | "mode", message: string }
    | { type: "closed" }

interface PendingDetection {
  mode: DetectionMode
  resolve: (result: RawDetection | boolean) => void
  reject: (error: Error) => void
}

interface PendingMode {
  mode: DetectionMode
  resolve: (delegate: Delegate) => void
  reject: (error: Error) => void
}

/** Main-thread proxy. MediaPipe initialization and synchronous inference run in its worker. */
export class Landmarkers {
  private readonly worker: Worker
  private readonly loadPromise: Promise<Delegate>
  private resolveLoad!: (delegate: Delegate) => void
  private rejectLoad!: (error: Error) => void
  private loadSettled = false
  private pendingDetection: PendingDetection | null = null
  private pendingMode: PendingMode | null = null
  private currentMode: DetectionMode | null = null
  private activeDelegate: Delegate | null = null
  private closed = false
  private terminationTimer: number | null = null

  constructor(private readonly onAttempt: (delegate: Delegate) => void) {
    this.loadPromise = new Promise((resolve, reject) => {
      this.resolveLoad = resolve
      this.rejectLoad = reject
    })

    this.worker = new Worker(
      new URL("./landmarkers.worker.ts", import.meta.url),
      { type: "module" },
    )
    this.worker.addEventListener("message", this.handleMessage)
    this.worker.addEventListener("error", this.handleWorkerError)
    this.worker.addEventListener("messageerror", this.handleMessageError)
    this.worker.postMessage({ type: "load" } satisfies LandmarkerWorkerRequest)
  }

  load(): Promise<Delegate> {
    return this.loadPromise
  }

  detect(frame: ImageBitmap, timestampMs: number): Promise<RawDetection> {
    return this.sendDetection(frame, timestampMs, "full").then((result) => {
      if (typeof result === "boolean")
        throw new Error("Expected full posture detection results")
      return result
    })
  }

  detectPresence(frame: ImageBitmap, timestampMs: number): Promise<boolean> {
    return this.sendDetection(frame, timestampMs, "presence").then((result) => {
      if (typeof result !== "boolean")
        throw new Error("Expected a face-presence result")
      return result
    })
  }

  enterLowPowerMode(): Promise<Delegate> {
    return this.changeMode("presence")
  }

  resumeFullMode(): Promise<Delegate> {
    return this.changeMode("full")
  }

  private sendDetection(
    frame: ImageBitmap,
    timestampMs: number,
    mode: DetectionMode,
  ): Promise<RawDetection | boolean> {
    if (this.closed) {
      frame.close()
      return Promise.reject(new Error("The posture detection worker is closed"))
    }
    if (this.pendingDetection) {
      frame.close()
      return Promise.reject(new Error("A posture detection frame is already in progress"))
    }
    if (this.currentMode !== mode) {
      frame.close()
      return Promise.reject(new Error(`Posture detection worker is not in ${mode} mode`))
    }

    return new Promise((resolve, reject) => {
      this.pendingDetection = { mode, resolve, reject }
      try {
        this.worker.postMessage(
          { type: "detect", mode, frame, timestampMs } satisfies LandmarkerWorkerRequest,
          [frame],
        )
      }
      catch (error) {
        this.pendingDetection = null
        frame.close()
        reject(asError(error))
      }
    })
  }

  private changeMode(mode: DetectionMode): Promise<Delegate> {
    if (this.closed)
      return Promise.reject(new Error("The posture detection worker is closed"))
    if (this.currentMode === mode && this.activeDelegate)
      return Promise.resolve(this.activeDelegate)
    if (this.pendingMode)
      return Promise.reject(new Error("A posture detection mode change is already in progress"))

    return new Promise((resolve, reject) => {
      this.pendingMode = { mode, resolve, reject }
      try {
        this.worker.postMessage({ type: "set-mode", mode } satisfies LandmarkerWorkerRequest)
      }
      catch (error) {
        this.pendingMode = null
        reject(asError(error))
      }
    })
  }

  close(): void {
    if (this.closed)
      return
    this.closed = true

    if (!this.loadSettled) {
      this.loadSettled = true
      this.rejectLoad(new Error("The posture detection worker was closed"))
    }
    this.pendingDetection?.reject(new Error("The posture detection worker was closed"))
    this.pendingDetection = null
    this.pendingMode?.reject(new Error("The posture detection worker was closed"))
    this.pendingMode = null

    try {
      this.worker.postMessage({ type: "close" } satisfies LandmarkerWorkerRequest)
      this.terminationTimer = window.setTimeout(() => this.terminate(), 1500)
    }
    catch {
      this.terminate()
    }
  }

  private readonly handleMessage = (event: MessageEvent<LandmarkerWorkerResponse>): void => {
    const response = event.data
    if (response.type === "attempt") {
      this.onAttempt(response.delegate)
      return
    }
    if (response.type === "loaded") {
      this.currentMode = "full"
      this.activeDelegate = response.delegate
      if (!this.loadSettled) {
        this.loadSettled = true
        this.resolveLoad(response.delegate)
      }
      return
    }
    if (response.type === "mode-ready") {
      this.currentMode = response.mode
      this.activeDelegate = response.delegate
      const pending = this.pendingMode
      this.pendingMode = null
      if (pending?.mode === response.mode)
        pending.resolve(response.delegate)
      else
        pending?.reject(new Error(`The worker changed to unexpected ${response.mode} mode`))
      return
    }
    if (response.type === "detected") {
      const pending = this.pendingDetection
      this.pendingDetection = null
      if (pending?.mode === "full")
        pending.resolve(response.detection)
      else
        pending?.reject(new Error("Received full detection results while in presence mode"))
      return
    }
    if (response.type === "presence") {
      const pending = this.pendingDetection
      this.pendingDetection = null
      if (pending?.mode === "presence")
        pending.resolve(response.present)
      else
        pending?.reject(new Error("Received a presence result while in full detection mode"))
      return
    }
    if (response.type === "error") {
      const error = new Error(response.message)
      if (response.operation === "load" && !this.loadSettled) {
        this.loadSettled = true
        this.rejectLoad(error)
      }
      else if (response.operation === "detect") {
        const pending = this.pendingDetection
        this.pendingDetection = null
        pending?.reject(error)
      }
      else if (response.operation === "mode") {
        const pending = this.pendingMode
        this.pendingMode = null
        pending?.reject(error)
      }
      return
    }
    if (response.type === "closed")
      this.terminate()
  }

  private readonly handleWorkerError = (event: ErrorEvent): void => {
    this.fail(new Error(event.message || "The posture detection worker failed"))
  }

  private readonly handleMessageError = (): void => {
    this.fail(new Error("Could not read a response from the posture detection worker"))
  }

  private fail(error: Error): void {
    this.closed = true
    if (!this.loadSettled) {
      this.loadSettled = true
      this.rejectLoad(error)
    }
    const pending = this.pendingDetection
    this.pendingDetection = null
    pending?.reject(error)
    const pendingMode = this.pendingMode
    this.pendingMode = null
    pendingMode?.reject(error)
    this.terminate()
  }

  private terminate(): void {
    if (this.terminationTimer !== null) {
      window.clearTimeout(this.terminationTimer)
      this.terminationTimer = null
    }
    this.worker.terminate()
  }
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
