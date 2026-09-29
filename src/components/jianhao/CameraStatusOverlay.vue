<script setup lang="ts">
import type { CameraFrameShape } from "@/modules/posture/engine/storage"
import type { MonitorStatus } from "@/modules/posture/usePostureMonitor"
import { Camera, Play } from "@lucide/vue"
import { usePreferredReducedMotion } from "@vueuse/core"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { POSTURE_ALERT_BREATH_PERIOD_MS } from "@/modules/posture/alert"

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
    :style="{ '--posture-alert-breath-duration': `${POSTURE_ALERT_BREATH_PERIOD_MS}ms` }"
    :class="[
      props.frameShape === 'circle' || props.frameShape === 'capsule' ? 'rounded-full' : 'rounded-[20px]',
      { 'posture-alert-border--static': preferredMotion === 'reduce' },
    ]"
  />

  <div
    v-if="!props.isMonitoring || props.status === 'error'"
    class="absolute inset-0 z-10 flex items-center text-foreground transition-opacity duration-150"
    :class="props.frameShape === 'capsule'
      ? 'justify-center gap-2 rounded-full px-3 group-hover:pointer-events-none group-hover:opacity-0'
      : 'flex-col justify-center gap-3 px-5 text-center backdrop-blur-[2px]'"
  >
    <Spinner
      v-if="props.isLoading"
      class="shrink-0"
      :class="props.frameShape === 'capsule' ? 'size-4' : 'size-5'"
    />
    <Camera
      v-else
      class="shrink-0 text-foreground/80"
      :class="props.frameShape === 'capsule' ? 'size-4' : 'size-6'"
      :stroke-width="1.8"
    />
    <div
      class="min-w-0"
      :class="props.frameShape === 'capsule'
        ? 'max-w-[82%]'
        : props.frameShape === 'circle'
          ? 'max-w-full space-y-2'
          : 'max-w-full space-y-3'"
    >
      <p
        class="text-foreground/80"
        :class="[
          props.frameShape === 'capsule'
            ? 'truncate text-center text-xs'
            : props.frameShape === 'circle'
              ? 'text-xs'
              : 'text-sm',
          isLiveAlert ? 'text-destructive' : '',
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
        v-if="!props.isLoading && props.frameShape !== 'capsule'"
        type="button"
        class="inline-flex items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-60"
        :class="props.frameShape === 'circle'
          ? 'h-9 gap-1.5 px-4 text-xs'
          : 'h-10 gap-2 px-5 text-sm'"
        :aria-label="props.startLabel"
        :title="props.startLabel"
        @click="emit('start')"
      >
        <Play class="size-4 fill-current" />
        {{ props.startLabel }}
      </button>
    </div>
  </div>

  <div
    v-if="props.isMonitoring"
    class="pointer-events-none absolute inset-x-0 z-10 flex transition-opacity duration-150"
    :class="props.frameShape === 'capsule'
      ? 'top-1/2 -translate-y-1/2 items-center justify-center gap-2 px-3 text-center group-hover:opacity-0'
      : props.frameShape === 'circle'
        ? 'top-[33%] flex-col items-center justify-center gap-2 px-3 pt-1 text-center'
        : 'top-0 flex-col items-center justify-start gap-2 bg-linear-to-b from-black/55 to-transparent px-4 pb-8 pt-3 text-center'"
  >
    <span
      v-if="props.frameShape === 'capsule'"
      class="size-1.5 shrink-0 rounded-full"
      :class="isLiveAlert ? 'bg-amber-300' : 'bg-emerald-300'"
      aria-hidden="true"
    />
    <p
      class="px-3 py-1"
      :class="[
        props.frameShape === 'capsule'
          ? 'max-w-[78%] truncate rounded-full text-xs leading-4 text-foreground'
          : props.frameShape === 'circle'
            ? 'max-w-full rounded-2xl bg-black/45 text-sm leading-5 text-white/90 backdrop-blur-md'
            : 'max-w-[75%] rounded-full bg-black/45 text-sm leading-5 text-white/90 backdrop-blur-md',
        isLiveAlert
          ? props.frameShape === 'capsule'
            ? 'text-destructive'
            : 'text-amber-100'
          : '',
      ]"
      role="status"
    >
      {{ props.isCalibrating ? props.message : liveMessage }}
    </p>
    <div
      v-if="props.isCalibrating"
      class="shrink-0"
      :class="props.frameShape === 'capsule'
        ? 'w-12'
        : props.frameShape === 'circle'
          ? 'mx-auto w-24'
          : 'w-24'"
    >
      <Progress :model-value="Math.round(props.calibrationProgress * 100)" />
    </div>
  </div>
</template>
