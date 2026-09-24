<script setup lang="ts">
import type { CameraFrameShape } from "@/features/posture/engine/storage"
import {
  Circle,
  GripVertical,
  Pin,
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
}>()

const emit = defineEmits<{
  toggleAlwaysOnTop: [enabled: boolean]
  frameShapeChange: [shape: CameraFrameShape]
  closeWindow: []
}>()

const { t } = useI18n()
const targetFrameShape = computed(() =>
  props.frameShape === "circle" ? "rounded" : "circle",
)
const targetShapeLabel = computed(() =>
  targetFrameShape.value === "circle"
    ? t("settings.previewCircle")
    : t("settings.previewRounded"),
)
const shapeActionLabel = computed(
  () => `${t("settings.switchPreviewShape")}：${targetShapeLabel.value}`,
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
      class="pointer-events-none absolute flex items-center rounded-full bg-black/50 text-white opacity-0 shadow-lg backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
      :class="props.frameShape === 'circle'
        ? 'left-1/2 top-[13%] -translate-x-1/2 gap-0.5 p-1'
        : 'right-2 top-2 gap-1 p-1'"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        class="pointer-events-auto cursor-move rounded-full text-white hover:bg-white/20 hover:text-white"
        :aria-label="t('nav.dragWindow')"
        :title="t('nav.dragWindow')"
        :class="props.frameShape === 'circle' ? 'size-6' : ''"
        @mousedown.left="startDragging"
      >
        <GripVertical />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        class="pointer-events-auto rounded-full text-white hover:bg-white/20 hover:text-white"
        :aria-label="t('nav.alwaysOnTop')"
        :aria-pressed="props.alwaysOnTop"
        :title="props.windowControlFeedback || t('nav.alwaysOnTop')"
        :class="props.frameShape === 'circle' ? 'size-6' : ''"
        @click="emit('toggleAlwaysOnTop', !props.alwaysOnTop)"
      >
        <Pin :class="props.alwaysOnTop ? 'fill-current' : ''" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        class="pointer-events-auto rounded-full text-white hover:bg-white/20 hover:text-white"
        :class="props.frameShape === 'circle' ? 'size-6' : ''"
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
          v-else
          aria-hidden="true"
          class="size-4"
          :stroke-width="2"
        />
      </Button>
      <Button
        as-child
        variant="ghost"
        size="icon-sm"
        class="pointer-events-auto rounded-full text-white hover:bg-white/20 hover:text-white"
        :class="props.frameShape === 'circle' ? 'size-6' : ''"
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
        class="pointer-events-auto rounded-full text-white hover:bg-destructive hover:text-white"
        :class="props.frameShape === 'circle' ? 'size-6' : ''"
        :aria-label="t('nav.closeWindow')"
        :title="t('nav.closeWindow')"
        @click="emit('closeWindow')"
      >
        <X />
      </Button>
    </nav>
  </div>
</template>
