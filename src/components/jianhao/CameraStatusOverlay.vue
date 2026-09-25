<script setup lang="ts">
import type { CameraFrameShape } from "@/modules/posture/engine/storage"
import type { MonitorStatus } from "@/modules/posture/usePostureMonitor"
import { Camera, Play } from "@lucide/vue"
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
  frameShape: CameraFrameShape
}>()

const emit = defineEmits<{
  start: []
}>()

const { t } = useI18n()
const preferredMotion = usePreferredReducedMotion()

const liveMessage = computed(() => {
  if (!props.hasBaseline && props.isMonitoring && !props.isCalibrating)
    return t("home.uncalibrated")
  return props.message
})

const isLiveAlert = computed(
  () => props.status === "error" || props.hasActiveAlert,
)

const showPostureAlert = computed(
  () =>
    props.isMonitoring && props.status === "running" && props.hasActiveAlert,
)
</script>

<template>
  <div
    v-if="showPostureAlert"
    aria-hidden="true"
    class="posture-alert-border pointer-events-none absolute inset-0 z-20"
    :class="[
      props.frameShape === 'circle' ? 'rounded-full' : 'rounded-[20px]',
      { 'posture-alert-border--static': preferredMotion === 'reduce' },
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
        :class="props.frameShape === 'circle'
          ? 'h-9 gap-1.5 px-4 text-xs'
          : 'h-10 gap-2 px-5 text-sm'"
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
    :class="props.frameShape === 'circle'
      ? 'top-[33%] flex-col items-center justify-center gap-2 px-3 pt-1 text-center'
      : 'top-0 flex-col items-center justify-start gap-2 bg-linear-to-b from-black/55 to-transparent px-4 pb-8 pt-3 text-center'"
  >
    <p
      class="bg-black/45 text-white/90 backdrop-blur-md"
      :class="[
        props.frameShape === 'circle'
          ? 'max-w-full rounded-2xl px-3 py-1 text-sm leading-5'
          : 'max-w-[75%] rounded-full px-3 py-1 text-sm leading-5',
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
</template>
