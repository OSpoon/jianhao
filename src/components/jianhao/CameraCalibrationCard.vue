<script setup lang="ts">
import type { ComponentPublicInstance } from "vue"
import type { MonitorStatus } from "@/features/posture/usePostureMonitor"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"

const props = defineProps<{
  isMonitoring: boolean
  isCalibrating: boolean
  isLoading: boolean
  status: MonitorStatus
  hasBaseline: boolean
  startLabel: string
  message: string
  calibrationProgress: number
  isMirrored: boolean
}>()
const emit = defineEmits<{
  start: []
  calibrate: []
  mirrorToggle: [enabled: boolean]
  videoReady: [element: HTMLVideoElement | null]
  canvasReady: [element: HTMLCanvasElement | null]
}>()

const { t } = useI18n()

const liveMessage = computed(() => {
  if (!props.hasBaseline && props.isMonitoring && !props.isCalibrating) {
    return t("home.uncalibrated")
  }
  return props.message
})

const subtitle = computed(() => {
  if (props.status === "idle")
    return t("home.idle")
  if (props.status === "paused") {
    return `${props.message} · ${t("home.idle")}`
  }
  return liveMessage.value
})

const isLiveAlert = computed(
  () => props.status === "error" || liveMessage.value.startsWith(t("runtime.adjust", { issues: "" }).trim()),
)

type TemplateRef = Element | ComponentPublicInstance | null

function setVideoRef(element: TemplateRef): void {
  emit("videoReady", element instanceof HTMLVideoElement ? element : null)
}

function setCanvasRef(element: TemplateRef): void {
  emit("canvasReady", element instanceof HTMLCanvasElement ? element : null)
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t("home.cameraTitle") }}</CardTitle>
      <CardDescription
        :class="isLiveAlert ? 'text-destructive' : ''"
        :role="props.status === 'error' ? 'alert' : 'status'"
      >
        {{ subtitle }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div
        class="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted"
      >
        <video
          :ref="setVideoRef"
          class="absolute inset-0 size-full object-cover transition-transform"
          :class="{ '-scale-x-100': props.isMirrored }"
          autoplay
          muted
          playsinline
        />
        <canvas
          :ref="setCanvasRef"
          class="pointer-events-none absolute inset-0 size-full object-cover transition-transform"
          :class="{ '-scale-x-100': props.isMirrored }"
        />
        <div
          v-if="props.status === 'loading'"
          class="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Spinner />
          <span>{{ props.message }}</span>
        </div>
        <div
          v-else-if="!props.isMonitoring"
          class="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <span class="size-2 rounded-full bg-primary" />
          <span>{{ t("home.startCamera") }}</span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 pt-4">
        <Button
          :disabled="props.isLoading"
          :aria-busy="props.isLoading"
          @click="$emit('start')"
        >
          <Spinner v-if="props.isLoading" />
          {{ props.startLabel }}
        </Button>
        <Button
          variant="outline"
          :disabled="!props.isMonitoring || props.isCalibrating"
          @click="$emit('calibrate')"
        >
          {{ props.hasBaseline ? t("home.recalibrate") : t("home.calibrate") }}
        </Button>
        <label
          class="ml-auto inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"
        >
          <span>{{ t("home.mirror") }}</span>
          <Switch
            :model-value="props.isMirrored"
            :aria-label="t('home.mirrorAria')"
            @update:model-value="(enabled) => emit('mirrorToggle', enabled)"
          />
        </label>
      </div>

      <div v-if="props.isCalibrating" class="flex items-center gap-3 pt-3">
        <Progress
          class="flex-1"
          :model-value="Math.round(props.calibrationProgress * 100)"
        />
        <span
          class="min-w-10 text-right text-xs tabular-nums text-muted-foreground"
        >
          {{ Math.round(props.calibrationProgress * 100) }}%
        </span>
      </div>
    </CardContent>
  </Card>
</template>
