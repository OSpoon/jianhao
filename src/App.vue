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
    return "更新已下载"
  if (progress.phase === "installing")
    return "正在安装更新"
  return `正在下载更新 v${progress.version}`
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
      role="status"
      aria-live="polite"
      class="pointer-events-none absolute inset-x-2 top-[54px] z-50 rounded-2xl border border-white/10 bg-black/75 px-3 py-2 text-white shadow-lg backdrop-blur-md"
    >
      <div class="mb-1 flex items-center justify-between gap-2">
        <span class="truncate text-[11px] leading-4">{{ updateProgressLabel }}</span>
        <span class="shrink-0 text-[11px] tabular-nums text-white/75">
          {{ updateProgressDetail }}
        </span>
      </div>
      <div
        role="progressbar"
        :aria-valuenow="updateProgressPercent ?? undefined"
        :aria-valuemin="0"
        :aria-valuemax="100"
        class="h-1 overflow-hidden rounded-full bg-white/20"
      >
        <div
          class="h-full rounded-full bg-brand-coral transition-[width] duration-150"
          :class="updateProgressPercent === null ? 'w-1/3 animate-pulse' : ''"
          :style="updateProgressPercent === null ? undefined : { width: `${updateProgressPercent}%` }"
        />
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
