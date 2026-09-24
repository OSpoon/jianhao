/** Camera constraints for landmark inference; 640x480 keeps processing inexpensive. */
export function cameraConstraints(deviceId = ""): MediaStreamConstraints {
  return {
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      aspectRatio: { ideal: 4 / 3 },
      frameRate: { ideal: 15, max: 30 },
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }),
    },
    audio: false,
  }
}
