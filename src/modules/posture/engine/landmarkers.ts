import type { FaceLandmarkerResult, PoseLandmarkerResult } from "@mediapipe/tasks-vision"

export type Delegate = "GPU" | "CPU"
export type DetectionMode = "full" | "presence"

export interface RawDetection {
  face: FaceLandmarkerResult
  pose: PoseLandmarkerResult
}

export interface StreamFrameResult {
  mode: DetectionMode
  frameId: number
  timestampMs: number
  width: number
  height: number
  detection?: RawDetection
  present?: boolean
}

export type LandmarkerWorkerRequest
  = | { type: "load" }
    | { type: "set-mode", mode: DetectionMode }
    | { type: "start-track", track: MediaStreamTrack }
    | { type: "stop-track" }
    | { type: "set-frame-interval", intervalMs: number }
    | { type: "frame-ack", frameId: number }
    | { type: "close" }

export type LandmarkerWorkerResponse
  = | { type: "capabilities", trackProcessor: boolean }
    | { type: "track-started" }
    | { type: "track-stopped" }
    | { type: "track-unavailable", reason: "unsupported" | "start", message: string }
    | { type: "stream-detected", frame: StreamFrameResult }
    | { type: "attempt", delegate: Delegate }
    | { type: "loaded", delegate: Delegate }
    | { type: "mode-ready", mode: DetectionMode, delegate: Delegate }
    | { type: "error", operation: "load" | "detect" | "mode" | "track", message: string }
    | { type: "closed" }

interface PendingMode {
  mode: DetectionMode
  resolve: (delegate: Delegate) => void
  reject: (error: Error) => void
}

interface PendingTrackStart {
  promise: Promise<void>
  resolve: () => void
  reject: (error: Error) => void
  cancelled: boolean
}

export class TrackProcessorUnsupportedError extends Error {
  constructor() {
    super("MediaStreamTrackProcessor is unavailable in this Web Worker")
    this.name = "TrackProcessorUnsupportedError"
  }
}

/** Main-thread proxy. MediaPipe initialization and streamed inference run in its worker. */
export class Landmarkers {
  private readonly worker: Worker
  private readonly loadPromise: Promise<Delegate>
  private resolveLoad!: (delegate: Delegate) => void
  private rejectLoad!: (error: Error) => void
  private loadSettled = false
  private pendingMode: PendingMode | null = null
  private pendingTrackStart: PendingTrackStart | null = null
  private pendingTrackStop: { promise: Promise<void>, resolve: () => void } | null = null
  private readonly trackProcessorSupportPromise: Promise<boolean>
  private resolveTrackProcessorSupport!: (supported: boolean) => void
  private trackStreaming = false
  private currentMode: DetectionMode | null = null
  private activeDelegate: Delegate | null = null
  private closed = false
  private terminationTimer: number | null = null

  constructor(
    private readonly onAttempt: (delegate: Delegate) => void,
    private readonly onStreamFrame: (frame: StreamFrameResult) => Promise<void> | void,
    private readonly onStreamError: (error: Error) => void,
  ) {
    this.trackProcessorSupportPromise = new Promise((resolve) => {
      this.resolveTrackProcessorSupport = resolve
    })
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

  startTrack(track: MediaStreamTrack): Promise<void> {
    if (this.closed) {
      track.stop()
      return Promise.reject(new Error("The posture detection worker is closed"))
    }
    if (this.pendingTrackStart) {
      track.stop()
      return Promise.reject(new Error("A camera track is already starting"))
    }

    let resolve!: () => void
    let reject!: (error: Error) => void
    const promise = new Promise<void>((done, fail) => {
      resolve = done
      reject = fail
    })
    const pending: PendingTrackStart = { promise, resolve, reject, cancelled: false }
    this.pendingTrackStart = pending
    void this.startPendingTrack(track, pending)
    return promise
  }

  async stopTrack(): Promise<void> {
    const pendingStart = this.pendingTrackStart
    if (pendingStart) {
      pendingStart.cancelled = true
      try {
        await pendingStart.promise
      }
      catch {
        // A start canceled before transfer has already stopped its local track.
      }
    }
    if (this.pendingTrackStop)
      return this.pendingTrackStop.promise
    if (!this.trackStreaming || this.closed)
      return

    let resolve!: () => void
    const promise = new Promise<void>((done) => {
      resolve = done
    })
    this.pendingTrackStop = { promise, resolve }
    try {
      this.worker.postMessage({ type: "stop-track" } satisfies LandmarkerWorkerRequest)
    }
    catch {
      this.trackStreaming = false
      this.pendingTrackStop = null
      resolve()
    }
    return promise
  }

  private async startPendingTrack(track: MediaStreamTrack, pending: PendingTrackStart): Promise<void> {
    try {
      const supported = await this.trackProcessorSupportPromise
      if (pending.cancelled || this.pendingTrackStart !== pending || this.closed) {
        track.stop()
        if (this.pendingTrackStart === pending) {
          this.pendingTrackStart = null
          pending.reject(new Error("Camera track startup was canceled"))
        }
        return
      }
      if (!supported) {
        track.stop()
        this.pendingTrackStart = null
        pending.reject(new TrackProcessorUnsupportedError())
        return
      }

      this.worker.postMessage(
        { type: "start-track", track } satisfies LandmarkerWorkerRequest,
        [track as unknown as Transferable],
      )
    }
    catch (error) {
      this.pendingTrackStart = null
      track.stop()
      pending.reject(asError(error))
    }
  }

  setFrameInterval(intervalMs: number): void {
    if (this.closed)
      return
    try {
      this.worker.postMessage({ type: "set-frame-interval", intervalMs } satisfies LandmarkerWorkerRequest)
    }
    catch {
      // Best effort; the worker keeps its current frame interval.
    }
  }

  enterLowPowerMode(): Promise<Delegate> {
    return this.changeMode("presence")
  }

  resumeFullMode(): Promise<Delegate> {
    return this.changeMode("full")
  }

  close(): void {
    if (this.closed)
      return
    this.closed = true

    if (!this.loadSettled) {
      this.loadSettled = true
      this.rejectLoad(new Error("The posture detection worker was closed"))
    }
    this.pendingMode?.reject(new Error("The posture detection worker was closed"))
    this.pendingMode = null
    this.pendingTrackStart?.reject(new Error("The posture detection worker was closed"))
    if (this.pendingTrackStart)
      this.pendingTrackStart.cancelled = true
    this.pendingTrackStart = null

    try {
      this.worker.postMessage({ type: "close" } satisfies LandmarkerWorkerRequest)
      this.terminationTimer = window.setTimeout(() => this.terminate(), 1500)
    }
    catch {
      this.terminate()
    }
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

  private readonly handleMessage = (event: MessageEvent<LandmarkerWorkerResponse>): void => {
    const response = event.data
    if (response.type === "capabilities") {
      this.resolveTrackProcessorSupport(response.trackProcessor)
      return
    }
    if (response.type === "track-started") {
      this.trackStreaming = true
      this.pendingTrackStart?.resolve()
      this.pendingTrackStart = null
      return
    }
    if (response.type === "track-unavailable") {
      this.trackStreaming = false
      const error = response.reason === "unsupported"
        ? new TrackProcessorUnsupportedError()
        : new Error(response.message)
      this.pendingTrackStart?.reject(error)
      this.pendingTrackStart = null
      return
    }
    if (response.type === "track-stopped") {
      this.trackStreaming = false
      this.pendingTrackStop?.resolve()
      this.pendingTrackStop = null
      return
    }
    if (response.type === "stream-detected") {
      void Promise.resolve(this.onStreamFrame(response.frame))
        .catch(error => this.onStreamError(asError(error)))
        .finally(() => {
          if (!this.closed) {
            try {
              this.worker.postMessage({ type: "frame-ack", frameId: response.frame.frameId } satisfies LandmarkerWorkerRequest)
            }
            catch {
              // The worker is terminating.
            }
          }
        })
      return
    }
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
    if (response.type === "error") {
      const error = new Error(response.message)
      if (response.operation === "load" && !this.loadSettled) {
        this.loadSettled = true
        this.rejectLoad(error)
      }
      else if (response.operation === "mode") {
        const pending = this.pendingMode
        this.pendingMode = null
        pending?.reject(error)
      }
      else if (response.operation === "track") {
        const pending = this.pendingTrackStart
        this.pendingTrackStart = null
        if (pending)
          pending.reject(error)
        else
          this.onStreamError(error)
      }
      else if (response.operation === "detect") {
        this.onStreamError(error)
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
    const pendingMode = this.pendingMode
    this.pendingMode = null
    pendingMode?.reject(error)
    const pendingTrackStart = this.pendingTrackStart
    this.pendingTrackStart = null
    pendingTrackStart?.reject(error)
    this.pendingTrackStop?.resolve()
    this.pendingTrackStop = null
    this.onStreamError(error)
    this.terminate()
  }

  private terminate(): void {
    if (this.terminationTimer !== null) {
      window.clearTimeout(this.terminationTimer)
      this.terminationTimer = null
    }
    this.trackStreaming = false
    this.pendingTrackStart?.reject(new Error("The posture detection worker terminated"))
    this.pendingTrackStart = null
    this.pendingTrackStop?.resolve()
    this.pendingTrackStop = null
    this.resolveTrackProcessorSupport(false)
    this.worker.terminate()
  }
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
