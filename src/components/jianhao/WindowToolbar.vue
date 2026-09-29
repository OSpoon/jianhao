<script setup lang="ts">
import type { CameraFrameShape } from "@/modules/posture/engine/storage"
import { computed } from "vue"
import { useRoute } from "vue-router"
import CameraWindowToolbar from "@/components/jianhao/CameraWindowToolbar.vue"
import SettingsWindowHeader from "@/components/jianhao/SettingsWindowHeader.vue"

const props = defineProps<{
  logoUrl: string
  frameShape: CameraFrameShape
  alwaysOnTop: boolean
  windowControlFeedback: string
  isMonitoring: boolean
  isCalibrating: boolean
  isLoading: boolean
  hasBaseline: boolean
  startLabel: string
}>()

const emit = defineEmits<{
  toggleAlwaysOnTop: [enabled: boolean]
  frameShapeChange: [shape: CameraFrameShape]
  start: []
  calibrate: []
  minimizeWindow: []
  closeWindow: []
}>()

const route = useRoute()
const isCameraView = computed(() => route.name !== "settings")
</script>

<template>
  <CameraWindowToolbar
    v-if="isCameraView"
    :frame-shape="props.frameShape"
    :always-on-top="props.alwaysOnTop"
    :window-control-feedback="props.windowControlFeedback"
    :is-monitoring="props.isMonitoring"
    :is-calibrating="props.isCalibrating"
    :is-loading="props.isLoading"
    :has-baseline="props.hasBaseline"
    :start-label="props.startLabel"
    @toggle-always-on-top="emit('toggleAlwaysOnTop', $event)"
    @frame-shape-change="emit('frameShapeChange', $event)"
    @start="emit('start')"
    @calibrate="emit('calibrate')"
    @close-window="emit('closeWindow')"
  />
  <SettingsWindowHeader
    v-else
    :logo-url="props.logoUrl"
    :always-on-top="props.alwaysOnTop"
    :window-control-feedback="props.windowControlFeedback"
    @toggle-always-on-top="emit('toggleAlwaysOnTop', $event)"
    @minimize-window="emit('minimizeWindow')"
    @close-window="emit('closeWindow')"
  />
</template>
