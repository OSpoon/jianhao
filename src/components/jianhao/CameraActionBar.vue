<script setup lang="ts">
import type { CameraFrameShape } from "@/features/posture/engine/storage"
import { FlipHorizontal2, Pause, Play, RotateCcw } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { Spinner } from "@/components/ui/spinner"

const props = defineProps<{
  isMonitoring: boolean
  isCalibrating: boolean
  isLoading: boolean
  hasBaseline: boolean
  startLabel: string
  isMirrored: boolean
  frameShape: CameraFrameShape
}>()

const emit = defineEmits<{
  start: []
  calibrate: []
  mirrorToggle: [enabled: boolean]
}>()

const { t } = useI18n()
</script>

<template>
  <div
    v-if="props.isMonitoring"
    class="pointer-events-none absolute inset-x-0 flex items-end gap-2 bg-linear-to-t from-black/65 via-black/25 to-transparent px-3 pb-3 opacity-0 transition-opacity duration-200 group-hover/camera:opacity-100 group-focus-within/camera:opacity-100"
    :class="props.frameShape === 'circle'
      ? 'bottom-[8%] justify-center'
      : 'bottom-0 justify-between pt-12'"
  >
    <button
      type="button"
      class="pointer-events-auto inline-flex h-9 items-center gap-2 rounded-full bg-black/50 px-3 text-sm text-white backdrop-blur-md transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-wait disabled:opacity-60"
      :class="props.frameShape === 'circle' ? 'size-10 justify-center p-0' : ''"
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
        :class="props.frameShape === 'circle' ? 'size-10 justify-center p-0' : ''"
        :disabled="!props.isMonitoring || props.isCalibrating"
        :aria-label="props.hasBaseline ? t('home.recalibrate') : t('home.calibrate')"
        :title="props.hasBaseline ? t('home.recalibrate') : t('home.calibrate')"
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
</template>
