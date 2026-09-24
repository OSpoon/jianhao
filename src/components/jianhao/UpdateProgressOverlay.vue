<script setup lang="ts">
import type { UnlistenFn } from "@tauri-apps/api/event"
import { listen } from "@tauri-apps/api/event"
import { computed, onBeforeUnmount, onMounted, ref } from "vue"

defineProps<{
  isCircleWindow: boolean
}>()

interface UpdateProgress {
  phase: "downloading" | "ready" | "installing" | "hidden"
  downloaded: number
  contentLength: number | null
}

const updateProgress = ref<UpdateProgress | null>(null)
let unlistenUpdateProgress: UnlistenFn | undefined
let isUnmounted = false

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

onMounted(() => {
  void listen<UpdateProgress>("update-download-progress", ({ payload }) => {
    updateProgress.value = payload.phase === "hidden" ? null : payload
  })
    .then((unlisten) => {
      if (isUnmounted)
        unlisten()
      else
        unlistenUpdateProgress = unlisten
    })
    .catch(() => undefined)
})

onBeforeUnmount(() => {
  isUnmounted = true
  unlistenUpdateProgress?.()
})
</script>

<template>
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
    :class="isCircleWindow ? 'rounded-full' : 'rounded-[20px]'"
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
</template>
