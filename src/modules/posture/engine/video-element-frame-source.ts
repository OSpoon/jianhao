import type { DetectionMode } from "./landmarkers"

interface CapturedFrame {
  frame: ImageBitmap
  frameId: number
  timestampMs: number
}

/** Captures camera frames through a video element for worker-side inference. */
export class VideoElementFrameSource {
  private video: HTMLVideoElement | null = null
  private timer: number | null = null
  private frameIntervalMs = 66
  private frameInFlight = false
  private nextFrameId = 0
  private lastFrameAt = -Infinity
  private framesStarted = false
  private stopped = false

  constructor(
    private readonly track: MediaStreamTrack,
    private readonly onFrame: (frame: CapturedFrame) => void,
    private readonly onError: (error: Error) => void,
    private readonly onTrackEnded: () => void,
  ) {}

  async start(): Promise<void> {
    const video = document.createElement("video")
    video.autoplay = true
    video.muted = true
    video.playsInline = true
    video.srcObject = new MediaStream([this.track])
    this.video = video
    this.track.addEventListener("ended", this.handleTrackEnded, { once: true })

    try {
      await video.play()
      if (this.stopped)
        throw new Error("Camera frame capture was canceled")
    }
    catch (error) {
      this.stop()
      throw asError(error)
    }
  }

  startFrames(): void {
    this.framesStarted = true
    this.scheduleFrame(0)
  }

  setFrameInterval(intervalMs: number): void {
    this.frameIntervalMs = Math.max(0, Math.min(5000, intervalMs))
  }

  frameHandled(): void {
    if (this.stopped || !this.frameInFlight)
      return
    this.frameInFlight = false
    this.scheduleFrame(this.frameIntervalMs - (performance.now() - this.lastFrameAt))
  }

  async applyCaptureProfile(mode: DetectionMode): Promise<void> {
    if (this.stopped || this.track.readyState !== "live")
      return

    const size = mode === "presence" ? 320 : 640
    const height = mode === "presence" ? 240 : 480
    const frameRate = mode === "presence" ? 1 : 15
    try {
      await this.track.applyConstraints({
        width: { ideal: size, max: size },
        height: { ideal: height, max: height },
        frameRate: { ideal: frameRate, max: frameRate },
      })
    }
    catch {
      // Capture profile hints are best effort; cameras keep their current settings.
    }
  }

  stop(): void {
    if (this.stopped)
      return
    this.stopped = true
    if (this.timer !== null) {
      window.clearTimeout(this.timer)
      this.timer = null
    }
    this.frameInFlight = false
    this.track.removeEventListener("ended", this.handleTrackEnded)
    this.track.stop()
    const video = this.video
    this.video = null
    if (video) {
      video.pause()
      video.srcObject = null
    }
  }

  private scheduleFrame(delay: number): void {
    if (this.stopped || !this.framesStarted || !this.video || this.frameInFlight || this.timer !== null)
      return
    this.timer = window.setTimeout(() => {
      this.timer = null
      void this.captureFrame()
    }, Math.max(0, delay))
  }

  private async captureFrame(): Promise<void> {
    const video = this.video
    if (this.stopped || !this.framesStarted || !video)
      return
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.scheduleFrame(100)
      return
    }

    this.frameInFlight = true
    const frameId = ++this.nextFrameId
    const timestampMs = performance.now()
    let frame: ImageBitmap | null = null
    try {
      frame = await createImageBitmap(video)
      if (this.stopped || this.video !== video) {
        frame.close()
        this.frameInFlight = false
        return
      }
      this.lastFrameAt = timestampMs
      this.onFrame({ frame, frameId, timestampMs })
      frame = null
    }
    catch (error) {
      frame?.close()
      this.frameInFlight = false
      if (!this.stopped)
        this.onError(asError(error))
    }
  }

  private readonly handleTrackEnded = (): void => {
    this.stop()
    this.onTrackEnded()
  }
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
