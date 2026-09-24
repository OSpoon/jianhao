<script setup lang="ts">
import type { ComponentPublicInstance } from "vue"
import type { CameraFrameShape } from "@/features/posture/engine/storage"
import type { MonitorStatus } from "@/features/posture/usePostureMonitor"
import { Camera, FlipHorizontal2, Pause, Play, RotateCcw } from "@lucide/vue"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { usePreferredReducedMotion } from "@vueuse/core"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"

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

const { t } = useI18n()
const preferredMotion = usePreferredReducedMotion()

const liveMessage = computed(() => {
  if (!props.hasBaseline && props.isMonitoring && !props.isCalibrating)
    return t("home.uncalibrated")
  return props.message
})

const isLiveAlert = computed(
  () =>
    props.status === "error"
    || liveMessage.value.startsWith(t("runtime.adjust", { issues: "" }).trim()),
)
const showPostureAlert = computed(
  () =>
    props.isMonitoring && props.status === "running" && props.hasActiveAlert,
)

type TemplateRef = Element | ComponentPublicInstance | null

function setVideoRef(element: TemplateRef): void {
  emit("videoReady", element instanceof HTMLVideoElement ? element : null)
}

function setCanvasRef(element: TemplateRef): void {
  emit("canvasReady", element instanceof HTMLCanvasElement ? element : null)
}

function handleCameraDrag(event: MouseEvent): void {
  if (event.button !== 0)
    return
  if (
    event.target instanceof Element
    && event.target.closest("button, a, input, [role='button']")
  ) {
    return
  }

  try {
    void getCurrentWindow()
      .startDragging()
      .catch(() => undefined)
  }
  catch {
    // Window dragging is available only in the native Tauri window.
  }
}
</script>

<template>
  <section
    class="group/camera relative min-h-0 overflow-hidden bg-[#171614] text-white"
    :class="[
      props.frameShape === 'circle'
        ? 'absolute bottom-0 left-1/2 size-52.5 -translate-x-1/2 rounded-full'
        : 'h-full w-full rounded-[20px]',
    ]"
    :aria-label="t('home.cameraTitle')"
    @mousedown.left="handleCameraDrag"
  >
    <video
      :ref="setVideoRef"
      class="absolute inset-0 size-full object-cover"
      :class="{ '-scale-x-100': props.isMirrored }"
      autoplay
      muted
      playsinline
    />
    <canvas
      :ref="setCanvasRef"
      class="pointer-events-none absolute inset-0 size-full object-cover"
      :class="{ '-scale-x-100': props.isMirrored }"
    />

    <div
      v-if="showPostureAlert"
      aria-hidden="true"
      class="posture-alert-overlay pointer-events-none absolute inset-0 z-20"
      :class="[
        props.frameShape === 'circle' ? 'rounded-full' : 'rounded-[20px]',
        { 'posture-alert-overlay--static': preferredMotion === 'reduce' },
      ]"
    />

    <div
      v-if="!props.isMonitoring || props.status === 'error'"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/35 px-5 text-center backdrop-blur-[2px]"
      :class="props.frameShape === 'circle' ? 'rounded-full' : ''"
    >
      <Spinner v-if="props.isLoading" class="size-5" />
      <Camera v-else class="size-6 text-white/80" :stroke-width="1.8" />
      <div
        class="max-w-full space-y-3"
        :class="props.frameShape === 'circle' ? 'space-y-2' : ''"
      >
        <p
          class="text-white/80"
          :class="[
            props.frameShape === 'circle' ? 'text-xs' : 'text-sm',
            isLiveAlert ? 'text-red-100' : '',
          ]"
          :role="props.status === 'error' ? 'alert' : 'status'"
        >
          {{
            props.isLoading
              ? props.message
              : props.status === "error"
                ? props.message
                : t("home.startCamera")
          }}
        </p>
        <button
          v-if="!props.isLoading"
          type="button"
          class="inline-flex items-center justify-center rounded-full bg-white font-semibold text-[#292522] shadow-lg transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 disabled:cursor-wait disabled:opacity-60"
          :class="
            props.frameShape === 'circle'
              ? 'h-9 gap-1.5 px-4 text-xs'
              : 'h-10 gap-2 px-5 text-sm'
          "
          :disabled="props.isLoading"
          :aria-busy="props.isLoading"
          @click="emit('start')"
        >
          <Play class="size-4 fill-current" />
          {{ props.startLabel }}
        </button>
      </div>
    </div>

    <div
      v-if="props.isMonitoring"
      class="pointer-events-none absolute inset-x-0 flex opacity-100"
      :class="
        props.frameShape === 'circle'
          ? 'top-[33%] flex-col items-center justify-center gap-2 px-3 pt-1 text-center'
          : 'top-0 flex-col items-center justify-start gap-2 bg-linear-to-b from-black/55 to-transparent px-4 pb-8 pt-3 text-center'
      "
    >
      <p
        class="bg-black/45 text-white/90 backdrop-blur-md"
        :class="[
          props.frameShape === 'circle'
            ? 'max-w-full rounded-2xl px-3 py-1 text-xs leading-4'
            : 'max-w-[75%] rounded-full px-3 py-1 text-xs leading-5',
          isLiveAlert ? 'text-amber-100' : '',
        ]"
        role="status"
      >
        {{ props.isCalibrating ? props.message : liveMessage }}
      </p>
      <div
        v-if="props.isCalibrating"
        class="w-24"
        :class="props.frameShape === 'circle' ? 'mx-auto' : ''"
      >
        <Progress :model-value="Math.round(props.calibrationProgress * 100)" />
      </div>
    </div>

    <div
      v-if="props.isMonitoring"
      class="pointer-events-none absolute inset-x-0 flex items-end gap-2 bg-linear-to-t from-black/65 via-black/25 to-transparent px-3 pb-3 opacity-0 transition-opacity duration-200 group-hover/camera:opacity-100 group-focus-within/camera:opacity-100"
      :class="
        props.frameShape === 'circle'
          ? 'bottom-[8%] justify-center'
          : 'bottom-0 justify-between pt-12'
      "
    >
      <button
        type="button"
        class="pointer-events-auto inline-flex h-9 items-center gap-2 rounded-full bg-black/50 px-3 text-sm text-white backdrop-blur-md transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60"
        :class="
          props.frameShape === 'circle' ? 'size-10 justify-center p-0' : ''
        "
        :disabled="props.isLoading"
        :aria-label="props.startLabel"
        :aria-busy="props.isLoading"
        @click="emit('start')"
      >
        <Spinner v-if="props.isLoading" class="size-4" />
        <Pause v-else-if="props.isMonitoring" class="size-4 fill-current" />
        <Play v-else class="size-4 fill-current" />
        <span v-if="props.frameShape !== 'circle'">{{ props.startLabel }}</span>
      </button>

      <div class="pointer-events-auto flex items-center gap-1.5">
        <button
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded-full bg-black/50 px-3 text-sm text-white backdrop-blur-md transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50"
          :class="
            props.frameShape === 'circle' ? 'size-10 justify-center p-0' : ''
          "
          :disabled="!props.isMonitoring || props.isCalibrating"
          :aria-label="
            props.hasBaseline ? t('home.recalibrate') : t('home.calibrate')
          "
          :title="
            props.hasBaseline ? t('home.recalibrate') : t('home.calibrate')
          "
          @click="emit('calibrate')"
        >
          <RotateCcw class="size-4" />
          <span v-if="props.frameShape !== 'circle'">{{
            props.hasBaseline ? t("home.recalibrate") : t("home.calibrate")
          }}</span>
        </button>
        <button
          type="button"
          class="inline-flex size-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          :class="props.frameShape === 'circle' ? 'size-10' : ''"
          :aria-label="t('home.mirrorAria')"
          :aria-pressed="props.isMirrored"
          :title="t('home.mirror')"
          @click="emit('mirrorToggle', !props.isMirrored)"
        >
          <FlipHorizontal2 class="size-4 rotate-90" />
        </button>
      </div>
    </div>
  </section>
</template>
