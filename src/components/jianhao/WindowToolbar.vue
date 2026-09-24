<script setup lang="ts">
import type { CameraFrameShape } from "@/features/posture/engine/storage"
import { computed } from "vue"
import { useRoute } from "vue-router"
import CameraWindowToolbar from "@/components/jianhao/CameraWindowToolbar.vue"
import SettingsWindowHeader from "@/components/jianhao/SettingsWindowHeader.vue"

const props = defineProps<{
  logoUrl: string
  frameShape: CameraFrameShape
  alwaysOnTop: boolean
  windowControlFeedback: string
}>()

const emit = defineEmits<{
  toggleAlwaysOnTop: [enabled: boolean]
  frameShapeChange: [shape: CameraFrameShape]
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
    @toggle-always-on-top="emit('toggleAlwaysOnTop', $event)"
    @frame-shape-change="emit('frameShapeChange', $event)"
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
