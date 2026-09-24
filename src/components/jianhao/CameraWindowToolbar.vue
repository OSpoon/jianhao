<script setup lang="ts">
import type { CameraFrameShape } from "@/features/posture/engine/storage"
import { GripVertical, Pin, Settings2, X } from "@lucide/vue"
import { getCurrentWindow } from "@tauri-apps/api/window"
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
  closeWindow: []
}>()

const { t } = useI18n()

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
        ? 'left-1/2 top-[13%] -translate-x-1/2 gap-1 p-1'
        : 'right-2 top-2 gap-1 p-1'"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        class="pointer-events-auto cursor-move rounded-full text-white hover:bg-white/20 hover:text-white"
        :aria-label="t('nav.dragWindow')"
        :title="t('nav.dragWindow')"
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
        @click="emit('toggleAlwaysOnTop', !props.alwaysOnTop)"
      >
        <Pin :class="props.alwaysOnTop ? 'fill-current' : ''" />
      </Button>
      <Button
        as-child
        variant="ghost"
        size="icon-sm"
        class="pointer-events-auto rounded-full text-white hover:bg-white/20 hover:text-white"
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
        :aria-label="t('nav.closeWindow')"
        :title="t('nav.closeWindow')"
        @click="emit('closeWindow')"
      >
        <X />
      </Button>
    </nav>
  </div>
</template>
