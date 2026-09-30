<script setup lang="ts">
import type { ComponentPublicInstance } from "vue"
import type { CameraFrameShape } from "@/modules/posture/engine/storage"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { useI18n } from "vue-i18n"

const props = defineProps<{
  frameShape: CameraFrameShape
  isMirrored: boolean
}>()

const emit = defineEmits<{
  videoReady: [element: HTMLVideoElement | null]
  canvasReady: [element: HTMLCanvasElement | null]
}>()

const { t } = useI18n()

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
    class="group/camera relative min-h-0 overflow-hidden text-white"
    :class="props.frameShape === 'circle'
      ? 'absolute bottom-0 left-1/2 size-45 -translate-x-1/2 rounded-full bg-background/65'
      : props.frameShape === 'capsule'
        ? 'h-full w-full rounded-full border border-foreground/10 bg-background/70'
        : 'h-full w-full rounded-[20px] bg-background/65'"
    :aria-label="t('home.cameraTitle')"
    @mousedown.left="handleCameraDrag"
  >
    <video
      :ref="setVideoRef"
      class="absolute inset-0 size-full object-cover"
      :class="[
        { '-scale-x-100': props.isMirrored },
        props.frameShape === 'capsule' ? 'hidden' : '',
      ]"
      autoplay
      muted
      playsinline
    />
    <canvas
      v-if="props.frameShape !== 'capsule'"
      :ref="setCanvasRef"
      class="pointer-events-none absolute inset-0 size-full object-cover"
      :class="{ '-scale-x-100': props.isMirrored }"
    />
    <slot />
  </section>
</template>
