<script setup lang="ts">
import { inject } from "vue"
import CameraCalibrationCard from "@/components/jianhao/CameraCalibrationCard.vue"
import QuickHelpCard from "@/components/jianhao/QuickHelpCard.vue"
import { jianhaoAppKey } from "@/features/app/context"

const app = inject(jianhaoAppKey)

if (!app) {
  throw new Error("Jianhao app state was not provided")
}
</script>

<template>
  <div data-app-scroll class="min-h-0 flex-1 overflow-y-auto">
    <section class="mx-auto flex w-full max-w-[460px] flex-col gap-4 px-4 py-4">
      <CameraCalibrationCard
        :is-monitoring="app.isMonitoring.value"
        :is-calibrating="app.isCalibrating.value"
        :is-loading="app.monitor.status.value === 'loading'"
        :status="app.monitor.status.value"
        :has-baseline="app.monitor.baseline.value !== null"
        :start-label="app.startLabel.value"
        :message="app.monitor.message.value"
        :calibration-progress="app.monitor.calibrationProgress.value"
        :is-mirrored="app.cameraMirrored.value"
        @start="app.handleStart"
        @calibrate="app.handleCalibrate"
        @mirror-toggle="app.handleCameraMirror"
        @video-ready="app.handleVideoReady"
        @canvas-ready="app.handleCanvasReady"
      />

      <QuickHelpCard />
    </section>
  </div>
</template>
