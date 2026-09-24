<script setup lang="ts">
import type { CameraFrameShape } from "@/modules/posture/engine/storage"
import type { MonitorStatus } from "@/modules/posture/usePostureMonitor"
import CameraActionBar from "@/components/jianhao/CameraActionBar.vue"
import CameraPreviewSurface from "@/components/jianhao/CameraPreviewSurface.vue"
import CameraStatusOverlay from "@/components/jianhao/CameraStatusOverlay.vue"

const props = defineProps<{
  isMonitoring: boolean
  isCalibrating: boolean
  isLoading: boolean
  status: MonitorStatus
  hasBaseline: boolean
  hasActiveAlert: boolean
  startLabel: string
  message: string
  calibrationProgress: number
  isMirrored: boolean
  frameShape: CameraFrameShape
}>()

const emit = defineEmits<{
  start: []
  calibrate: []
  mirrorToggle: [enabled: boolean]
  videoReady: [element: HTMLVideoElement | null]
  canvasReady: [element: HTMLCanvasElement | null]
}>()
</script>

<template>
  <CameraPreviewSurface
    :frame-shape="props.frameShape"
    :is-mirrored="props.isMirrored"
    @video-ready="emit('videoReady', $event)"
    @canvas-ready="emit('canvasReady', $event)"
  >
    <CameraStatusOverlay
      :is-monitoring="props.isMonitoring"
      :is-calibrating="props.isCalibrating"
      :is-loading="props.isLoading"
      :status="props.status"
      :has-baseline="props.hasBaseline"
      :has-active-alert="props.hasActiveAlert"
      :start-label="props.startLabel"
      :message="props.message"
      :calibration-progress="props.calibrationProgress"
      :frame-shape="props.frameShape"
      @start="emit('start')"
    />
    <CameraActionBar
      :is-monitoring="props.isMonitoring"
      :is-calibrating="props.isCalibrating"
      :has-baseline="props.hasBaseline"
      :start-label="props.startLabel"
      :is-mirrored="props.isMirrored"
      :frame-shape="props.frameShape"
      @start="emit('start')"
      @calibrate="emit('calibrate')"
      @mirror-toggle="emit('mirrorToggle', $event)"
    />
  </CameraPreviewSurface>
</template>
