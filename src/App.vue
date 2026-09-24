<script setup lang="ts">
import { LogicalSize } from "@tauri-apps/api/dpi"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from "vue"
import { useRoute } from "vue-router"
import UpdateProgressOverlay from "@/components/jianhao/UpdateProgressOverlay.vue"
import WindowToolbar from "@/components/jianhao/WindowToolbar.vue"
import { jianhaoAppKey } from "@/modules/app/context"
import { useJianhaoApp } from "@/modules/app/useJianhaoApp"
import logoUrl from "./assets/brand-mark.png"

const previewVideo = ref<HTMLVideoElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const appState = useJianhaoApp(previewVideo, canvas)
const route = useRoute()
const isCircleCameraWindow = computed(
  () =>
    route.name !== "settings" && appState.cameraFrameShape.value === "circle",
)
const windowSize = computed(() =>
  route.name === "settings"
    ? { width: 360, height: 360 }
    : appState.cameraFrameShape.value === "circle"
      ? { width: 210, height: 210 }
      : { width: 360, height: 210 },
)
let pendingWindowResize = Promise.resolve()

function syncWindowSize(): void {
  const { width, height } = windowSize.value
  pendingWindowResize = pendingWindowResize
    .then(() => getCurrentWindow().setSize(new LogicalSize(width, height)))
    .catch(() => undefined)
}

function preventPageCopy(event: ClipboardEvent): void {
  const target = event.target
  if (
    target instanceof Element
    && target.closest(
      "input, textarea, [contenteditable]:not([contenteditable='false']), [role='textbox']",
    )
  ) {
    return
  }

  event.preventDefault()
}

onMounted(() => {
  syncWindowSize()
  document.addEventListener("copy", preventPageCopy, true)
})

watch(windowSize, syncWindowSize)

onBeforeUnmount(() => {
  document.removeEventListener("copy", preventPageCopy, true)
})

provide(jianhaoAppKey, appState)
</script>

<template>
  <main
    class="group relative flex flex-col overflow-hidden text-foreground"
    :style="{
      width: `${windowSize.width}px`,
      height: `${windowSize.height}px`,
    }"
    :class="
      route.name === 'settings'
        ? 'rounded-[20px] bg-background'
        : appState.cameraFrameShape.value === 'circle'
          ? 'bg-transparent'
          : 'rounded-[20px] bg-transparent'
    "
  >
    <UpdateProgressOverlay :is-circle-window="isCircleCameraWindow" />

    <WindowToolbar
      :logo-url="logoUrl"
      :frame-shape="appState.cameraFrameShape.value"
      :always-on-top="appState.alwaysOnTop.value"
      :window-control-feedback="appState.windowControlFeedback.value"
      @toggle-always-on-top="appState.handleAlwaysOnTop"
      @frame-shape-change="appState.handleCameraFrameShape"
      @minimize-window="appState.handleMinimizeWindow"
      @close-window="appState.handleCloseWindow"
    />

    <RouterView />
  </main>
</template>
