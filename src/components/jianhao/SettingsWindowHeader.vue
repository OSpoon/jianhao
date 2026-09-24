<script setup lang="ts">
import { ArrowLeft, Minus, Pin, X } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { RouterLink } from "vue-router"
import { Button } from "@/components/ui/button"

const props = defineProps<{
  logoUrl: string
  alwaysOnTop: boolean
  windowControlFeedback: string
}>()

const emit = defineEmits<{
  toggleAlwaysOnTop: [enabled: boolean]
  minimizeWindow: []
  closeWindow: []
}>()

const { t } = useI18n()
</script>

<template>
  <header
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
