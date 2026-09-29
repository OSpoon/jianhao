<script setup lang="ts">
import type { CameraFrameShape } from "@/modules/posture/engine/storage"
import {
  Circle,
  GripVertical,
  Pause,
  Pin,
  Play,
  RotateCcw,
  Settings2,
  SquareRoundCorner,
  X,
} from "@lucide/vue"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { RouterLink } from "vue-router"
import { Button } from "@/components/ui/button"

const props = defineProps<{
  frameShape: CameraFrameShape
  alwaysOnTop: boolean
  windowControlFeedback: string
  isMonitoring: boolean
  isCalibrating: boolean
  isLoading: boolean
  hasBaseline: boolean
  startLabel: string
}>()

const emit = defineEmits<{
  toggleAlwaysOnTop: [enabled: boolean]
  frameShapeChange: [shape: CameraFrameShape]
  start: []
  calibrate: []
  closeWindow: []
}>()

const { t } = useI18n()
const targetFrameShape = computed<CameraFrameShape>(() => {
  if (props.frameShape === "rounded")
    return "circle"
  if (props.frameShape === "circle")
    return "capsule"
  return "rounded"
})
const targetShapeLabel = computed(() => {
  if (targetFrameShape.value === "circle")
    return t("settings.previewCircle")
  if (targetFrameShape.value === "capsule")
    return t("settings.previewCapsule")
  return t("settings.previewRounded")
})
const shapeActionLabel = computed(
  () => `${t("settings.switchPreviewShape")}：${targetShapeLabel.value}`,
)
const controlButtonClass = computed(() =>
  props.frameShape === "capsule"
    ? "text-foreground hover:bg-foreground/10 hover:text-foreground"
    : "text-white hover:bg-white/20 hover:text-white",
)

function startDragging(): void {
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
  <div class="pointer-events-none absolute inset-0 z-40">
    <nav
      :aria-label="t('nav.windowControls')"
      class="pointer-events-none absolute flex items-center rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
      :class="props.frameShape === 'circle'
        ? 'left-1/2 top-[13%] -translate-x-1/2 gap-0.5 bg-black/50 p-1 text-white shadow-lg backdrop-blur-md'
        : props.frameShape === 'capsule'
          ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 gap-1 p-1.5 text-foreground'
          : 'right-2 top-2 gap-1 bg-black/50 p-1 text-white shadow-lg backdrop-blur-md'"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        class="pointer-events-auto cursor-move rounded-full"
        :aria-label="t('nav.dragWindow')"
        :title="t('nav.dragWindow')"
        :class="[controlButtonClass, props.frameShape === 'circle' ? 'size-6' : props.frameShape === 'capsule' ? 'size-7' : '']"
        @mousedown.left="startDragging"
      >
        <GripVertical />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        class="pointer-events-auto rounded-full"
        :aria-label="t('nav.alwaysOnTop')"
        :aria-pressed="props.alwaysOnTop"
        :title="props.windowControlFeedback || t('nav.alwaysOnTop')"
        :class="[controlButtonClass, props.frameShape === 'circle' ? 'size-6' : props.frameShape === 'capsule' ? 'size-7' : '']"
        @click="emit('toggleAlwaysOnTop', !props.alwaysOnTop)"
      >
        <Pin :class="props.alwaysOnTop ? 'fill-current' : ''" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        class="pointer-events-auto rounded-full"
        :class="[controlButtonClass, props.frameShape === 'circle' ? 'size-6' : props.frameShape === 'capsule' ? 'size-7' : '']"
        :aria-label="shapeActionLabel"
        :title="shapeActionLabel"
        @click="emit('frameShapeChange', targetFrameShape)"
      >
        <Circle
          v-if="targetFrameShape === 'circle'"
          aria-hidden="true"
          class="size-4"
          :stroke-width="2"
        />
        <SquareRoundCorner
          v-else-if="targetFrameShape === 'rounded'"
          aria-hidden="true"
          class="size-4"
          :stroke-width="2"
        />
        <span
          v-else
          aria-hidden="true"
          class="h-3 w-4 rounded-full border-2 border-current"
        />
      </Button>
      <Button
        as-child
        variant="ghost"
        size="icon-sm"
        class="pointer-events-auto rounded-full"
        :class="[controlButtonClass, props.frameShape === 'circle' ? 'size-6' : props.frameShape === 'capsule' ? 'size-7' : '']"
      >
        <RouterLink
          to="/settings"
          :aria-label="t('nav.openSettings')"
          :title="t('nav.settings')"
        >
          <Settings2 />
        </RouterLink>
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        class="pointer-events-auto rounded-full hover:bg-destructive hover:text-white"
        :class="[props.frameShape === 'capsule' ? 'size-7 text-foreground' : 'text-white', props.frameShape === 'circle' ? 'size-6' : '']"
        :aria-label="t('nav.closeWindow')"
        :title="t('nav.closeWindow')"
        @click="emit('closeWindow')"
      >
        <X />
      </Button>
      <template v-if="props.frameShape === 'capsule'">
        <span aria-hidden="true" class="mx-0.5 h-4 w-px shrink-0 bg-white/20" />
        <Button
          variant="ghost"
          size="icon-sm"
          class="pointer-events-auto size-7 rounded-full"
          :class="controlButtonClass"
          :aria-label="props.startLabel"
          :title="props.startLabel"
          :disabled="props.isLoading"
          @click="emit('start')"
        >
          <Pause v-if="props.isMonitoring" />
          <Play v-else />
        </Button>
        <Button
          v-if="props.isMonitoring"
          variant="ghost"
          size="icon-sm"
          class="pointer-events-auto size-7 rounded-full"
          :class="controlButtonClass"
          :disabled="props.isCalibrating"
          :aria-label="props.hasBaseline ? t('home.recalibrate') : t('home.calibrate')"
          :title="props.hasBaseline ? t('home.recalibrate') : t('home.calibrate')"
          @click="emit('calibrate')"
        >
          <RotateCcw />
        </Button>
      </template>
    </nav>
  </div>
</template>
