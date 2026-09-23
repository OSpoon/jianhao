/** Opens the front camera at a modest resolution; 640x480 is plenty for landmarks and keeps inference cheap. */
export async function openCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not support camera access (getUserMedia).")
  }
  return navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      aspectRatio: { ideal: 4 / 3 },
      frameRate: { ideal: 15, max: 30 },
      facingMode: "user",
    },
    audio: false,
  })
}

/** Changes camera capture cost for full monitoring and low-power presence checks. */
export async function requestCameraProfile(stream: MediaStream | null, profile: "monitoring" | "presence"): Promise<void> {
  const track = stream?.getVideoTracks()[0]
  if (!track || track.readyState !== "live")
    return

  const size = profile === "presence" ? { width: 320, height: 240 } : { width: 640, height: 480 }
  const frameRate = profile === "presence" ? 1 : 15

  try {
    await track.applyConstraints({
      width: { ideal: size.width, max: size.width },
      height: { ideal: size.height, max: size.height },
      frameRate: { ideal: frameRate, max: frameRate },
    })
  }
  catch {
    try {
      await track.applyConstraints({
        width: { ideal: size.width },
        height: { ideal: size.height },
        frameRate: { ideal: frameRate },
      })
    }
    catch {
      // Capture profile hints are best effort; unsupported cameras keep their current settings.
    }
  }
}

let screenWakeLock: WakeLockSentinel | null = null

/** Keeps the screen awake while monitoring. Best effort: unsupported browsers just skip it. */
export async function requestWakeLock(): Promise<void> {
  try {
    screenWakeLock = await navigator.wakeLock?.request("screen") ?? null
    screenWakeLock?.addEventListener("release", () => {
      screenWakeLock = null
    }, { once: true })
  }
  catch {
    // Wake lock is optional; denied or unsupported is fine.
  }
}

/** Releases the active screen wake lock while the app is in low-power presence mode. */
export async function releaseWakeLock(): Promise<void> {
  const wakeLock = screenWakeLock
  screenWakeLock = null
  if (!wakeLock || wakeLock.released)
    return

  try {
    await wakeLock.release()
  }
  catch {
    // The browser may already have released the lock.
  }
}
