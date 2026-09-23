import type { FrameMetrics, Point, Verdict } from "./engine/types"

const COLOR_OK = "#34d399"
const COLOR_BAD = "#E36F47"

export class PostureOverlay {
  private readonly context: CanvasRenderingContext2D

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d")
    if (!context)
      throw new Error("2D canvas context unavailable")
    this.context = context
  }

  resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
  }

  draw(metrics: FrameMetrics | null, verdict: Verdict | null): void {
    const { context, canvas } = this
    context.clearRect(0, 0, canvas.width, canvas.height)
    if (!metrics)
      return

    const { leftIris, rightIris, forehead, chin, ears, shoulders } = metrics.points
    const issues = verdict?.issues
    const eyeColor = issues?.tooClose.active || issues?.headTilt.active || issues?.blink.active ? COLOR_BAD : COLOR_OK
    const headColor = issues?.headDown.active ? COLOR_BAD : COLOR_OK
    const shoulderColor
      = issues?.slouch.active || issues?.shrug.active || issues?.sideLean.active || issues?.headForward.active
        ? COLOR_BAD
        : COLOR_OK

    context.lineWidth = 2
    this.line(leftIris, rightIris, eyeColor)
    this.dot(leftIris, eyeColor)
    this.dot(rightIris, eyeColor)
    this.line(forehead, chin, headColor)
    this.dot(forehead, headColor)
    this.dot(chin, headColor)

    if (shoulders) {
      this.line(shoulders[0], shoulders[1], shoulderColor)
      this.dot(shoulders[0], shoulderColor)
      this.dot(shoulders[1], shoulderColor)
      if (ears) {
        this.dot(ears[0], shoulderColor)
        this.dot(ears[1], shoulderColor)
      }
    }
  }

  private dot(point: Point, color: string): void {
    this.context.fillStyle = color
    this.context.beginPath()
    this.context.arc(point.x, point.y, 4, 0, Math.PI * 2)
    this.context.fill()
  }

  private line(start: Point, end: Point, color: string): void {
    this.context.strokeStyle = color
    this.context.beginPath()
    this.context.moveTo(start.x, start.y)
    this.context.lineTo(end.x, end.y)
    this.context.stroke()
  }
}
