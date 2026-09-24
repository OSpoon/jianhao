<script setup lang="ts">
import { inject } from "vue"
import CameraCalibrationCard from "@/components/jianhao/CameraCalibrationCard.vue"
import { jianhaoAppKey } from "@/features/app/context"

const app = inject(jianhaoAppKey)

if (!app) {
  throw new Error("Jianhao app state was not provided")
}
</script>

<template>
  <CameraCalibrationCard
    :is-monitoring="app.isMonitoring.value"
    :is-calibrating="app.isCalibrating.value"
    :is-loading="app.monitor.status.value === 'loading'"
    :status="app.monitor.status.value"
    :has-baseline="app.monitor.baseline.value !== null"
    :has-active-alert="app.monitor.verdict.value?.alarm ?? false"
    :start-label="app.startLabel.value"
    :message="app.monitor.message.value"
    :calibration-progress="app.monitor.calibrationProgress.value"
    :is-mirrored="app.cameraMirrored.value"
    :frame-shape="app.cameraFrameShape.value"
    @start="app.handleStart"
    @calibrate="app.handleCalibrate"
    @mirror-toggle="app.handleCameraMirror"
    @video-ready="app.handleVideoReady"
    @canvas-ready="app.handleCanvasReady"
  />
</template>
