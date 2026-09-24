<script setup lang="ts">
import type { UnlistenFn } from "@tauri-apps/api/event"
import { LogicalSize } from "@tauri-apps/api/dpi"
import { listen } from "@tauri-apps/api/event"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from "vue"
import { useRoute } from "vue-router"
import WindowToolbar from "@/components/jianhao/WindowToolbar.vue"
import { jianhaoAppKey } from "@/features/app/context"
import { useJianhaoApp } from "@/features/app/useJianhaoApp"
import logoUrl from "./assets/brand-mark.png"

const previewVideo = ref<HTMLVideoElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const updateProgress = ref<UpdateProgress | null>(null)
const appState = useJianhaoApp(previewVideo, canvas)
const route = useRoute()
const isCircleCameraWindow = computed(
  () => route.name !== "settings" && appState.cameraFrameShape.value === "circle",
)
const windowSize = computed(() =>
  route.name === "settings"
    ? { width: 360, height: 460 }
    : appState.cameraFrameShape.value === "circle"
      ? { width: 210, height: 210 }
      : { width: 360, height: 210 },
)
let pendingWindowResize = Promise.resolve()
let unlistenUpdateProgress: UnlistenFn | undefined

interface UpdateProgress {
  phase: "downloading" | "ready" | "installing" | "hidden"
  version: string
  downloaded: number
  contentLength: number | null
}

const updateProgressPercent = computed(() => {
  const progress = updateProgress.value
  if (!progress)
    return null
  if (progress.phase === "ready" || progress.phase === "installing")
    return 100
  if (!progress.contentLength)
    return null
  return Math.min(
    99,
    Math.floor((progress.downloaded / progress.contentLength) * 100),
  )
})

const updateProgressDetail = computed(() => {
  if (updateProgressPercent.value !== null)
    return `${updateProgressPercent.value}%`
  const downloadedMegabytes = (updateProgress.value?.downloaded ?? 0) / 1024 / 1024
  return `${downloadedMegabytes.toFixed(1)} MB`
})

const updateProgressLabel = computed(() => {
  const progress = updateProgress.value
  if (!progress)
    return ""
  if (progress.phase === "ready")
    return "等待确认安装"
  if (progress.phase === "installing")
    return "正在安装更新"
  return "正在下载更新"
})

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
  void listen<UpdateProgress>("update-download-progress", ({ payload }) => {
    updateProgress.value = payload.phase === "hidden" ? null : payload
  })
    .then((unlisten) => {
      unlistenUpdateProgress = unlisten
    })
    .catch(() => undefined)
})

watch(windowSize, syncWindowSize)

onBeforeUnmount(() => {
  document.removeEventListener("copy", preventPageCopy, true)
  unlistenUpdateProgress?.()
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
    <aside
      v-if="updateProgress"
      role="progressbar"
      aria-live="polite"
      aria-label="更新下载进度"
      :aria-valuenow="updateProgressPercent ?? undefined"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuetext="`${updateProgressLabel}，${updateProgressDetail}`"
      class="pointer-events-none absolute inset-0 z-30 overflow-hidden text-white"
      :class="isCircleCameraWindow ? 'rounded-full' : 'rounded-[20px]'"
    >
      <div class="absolute inset-0 bg-black/15" />
      <div
        class="absolute inset-y-0 left-0 bg-linear-to-r from-brand-coral/35 to-brand-amber/25 transition-[width] duration-150"
        :class="updateProgressPercent === null ? 'w-1/3 animate-pulse' : ''"
        :style="updateProgressPercent === null ? undefined : { width: `${updateProgressPercent}%` }"
      />
      <div class="absolute inset-0 flex items-center justify-center px-4">
        <div class="flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 shadow-lg backdrop-blur-md">
          <span class="text-xs font-medium">{{ updateProgressLabel }}</span>
          <span class="text-xs tabular-nums text-white/75">{{ updateProgressDetail }}</span>
        </div>
      </div>
    </aside>

    <WindowToolbar
      :logo-url="logoUrl"
      :frame-shape="appState.cameraFrameShape.value"
      :always-on-top="appState.alwaysOnTop.value"
      :window-control-feedback="appState.windowControlFeedback.value"
      @toggle-always-on-top="appState.handleAlwaysOnTop"
      @minimize-window="appState.handleMinimizeWindow"
      @close-window="appState.handleCloseWindow"
    />

    <RouterView />
  </main>
</template>
