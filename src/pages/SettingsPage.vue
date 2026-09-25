<script setup lang="ts">
import { inject } from "vue"
import CameraSettingsCard from "@/components/jianhao/CameraSettingsCard.vue"
import DiagnosticsCard from "@/components/jianhao/DiagnosticsCard.vue"
import MonitoringSettingsCard from "@/components/jianhao/MonitoringSettingsCard.vue"
import { jianhaoAppKey } from "@/modules/app/context"

const app = inject(jianhaoAppKey)

if (!app) {
  throw new Error("Jianhao app state was not provided")
}
</script>

<template>
  <div data-app-scroll class="min-h-0 flex-1 overflow-y-auto bg-background">
    <section class="mx-auto flex w-full flex-col px-4 pb-5 pt-1">
      <CameraSettingsCard
        :devices="app.cameraDevices.value"
        :camera-device-id="app.cameraDeviceId.value"
        @camera-device-change="app.handleCameraDeviceChange"
      />
      <MonitoringSettingsCard
        :sensitivity="app.monitor.sensitivity.value"
        :posture-alert-sound-enabled="app.postureAlertSoundEnabled.value"
        @sensitivity="app.handleSensitivity"
        @posture-alert-sound="app.handlePostureAlertSoundChange"
        @preview-posture-alert-sound="app.handlePostureAlertSoundPreview"
      />
      <DiagnosticsCard />
    </section>
  </div>
</template>
