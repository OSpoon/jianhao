<script setup lang="ts">
import type { CameraFrameShape } from "@/features/posture/engine/storage"
import { ArrowLeft, GripVertical, Minus, Pin, Settings2, X } from "@lucide/vue"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { RouterLink, useRoute } from "vue-router"
import { Button } from "@/components/ui/button"

const props = defineProps<{
  logoUrl: string
  frameShape: CameraFrameShape
  alwaysOnTop: boolean
  windowControlFeedback: string
}>()

const emit = defineEmits<{
  toggleAlwaysOnTop: [enabled: boolean]
  minimizeWindow: []
  closeWindow: []
}>()

const route = useRoute()
const { t } = useI18n()
const isCameraView = computed(() => route.name !== "settings")
const isCircle = computed(
  () => isCameraView.value && props.frameShape === "circle",
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
  <div v-if="isCameraView" class="pointer-events-none absolute inset-0 z-40">
    <nav
      :aria-label="t('nav.windowControls')"
      class="pointer-events-none absolute flex items-center rounded-full bg-black/50 text-white opacity-0 shadow-lg backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
      :class="
        isCircle
          ? 'left-1/2 top-[13%] -translate-x-1/2 gap-1 p-1'
          : 'right-2 top-2 gap-1 p-1'
      "
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

  <header
    v-else
    data-tauri-drag-region
    class="flex h-12 w-full shrink-0 items-center justify-between border-b border-border/60 bg-transparent px-4 text-foreground"
  >
    <div
      data-tauri-drag-region
      class="flex min-w-0 cursor-grab items-center gap-2 active:cursor-grabbing"
    >
      <img
        data-tauri-drag-region
        :src="props.logoUrl"
        class="size-5 shrink-0 rounded-md"
        alt=""
      >
      <strong
        data-tauri-drag-region
        class="whitespace-nowrap text-sm font-semibold"
      >{{ t("app.brand") }}</strong>
      <span data-tauri-drag-region class="text-foreground/45">/</span>
      <span
        data-tauri-drag-region
        class="whitespace-nowrap text-xs text-muted-foreground"
      >{{ t("nav.settings") }}</span>
    </div>
    <div class="flex shrink-0 items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        class="hover:bg-foreground/10 hover:text-foreground"
        :aria-label="t('nav.alwaysOnTop')"
        :aria-pressed="props.alwaysOnTop"
        :title="props.windowControlFeedback || t('nav.alwaysOnTop')"
        @click="emit('toggleAlwaysOnTop', !props.alwaysOnTop)"
      >
        <Pin :class="props.alwaysOnTop ? 'fill-current' : ''" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        class="hover:bg-foreground/10 hover:text-foreground"
        :aria-label="t('nav.minimizeWindow')"
        :title="t('nav.minimizeWindow')"
        @click="emit('minimizeWindow')"
      >
        <Minus />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        class="hover:bg-destructive hover:text-white"
        :aria-label="t('nav.closeWindow')"
        :title="t('nav.closeWindow')"
        @click="emit('closeWindow')"
      >
        <X />
      </Button>
      <Button as-child variant="ghost" size="sm" class="rounded-full hover:bg-foreground/10 hover:text-foreground">
        <RouterLink to="/" :aria-label="t('nav.backHome')">
          <ArrowLeft />
          {{ t("nav.back") }}
        </RouterLink>
      </Button>
    </div>
  </header>
</template>
