<script setup lang="ts">
import { ArrowLeft, Settings2 } from "@lucide/vue"
import { useI18n } from "vue-i18n"
import { RouterLink, useRoute } from "vue-router"
import { Button } from "@/components/ui/button"

defineProps<{ logoUrl: string }>()

const route = useRoute()
const { t } = useI18n()
</script>

<template>
  <header class="flex h-12 items-center justify-between border-b bg-background/95 px-4">
    <div class="flex min-w-0 items-center gap-2">
      <img :src="logoUrl" class="size-5 shrink-0 rounded-md" alt="">
      <strong class="whitespace-nowrap text-sm font-semibold">{{ t("app.brand") }}</strong>
      <span class="text-muted-foreground">/</span>
      <span class="whitespace-nowrap text-xs text-muted-foreground">{{ route.name === "settings" ? t("nav.settings") : t("nav.home") }}</span>
    </div>
    <Button v-if="route.name === 'settings'" as-child variant="ghost" size="sm">
      <RouterLink to="/" :aria-label="t('nav.backHome')">
        <ArrowLeft />
        {{ t("nav.back") }}
      </RouterLink>
    </Button>
    <Button v-else as-child variant="ghost" size="sm">
      <RouterLink to="/settings" :aria-label="t('nav.openSettings')">
        <Settings2 />
        {{ t("nav.settings") }}
      </RouterLink>
    </Button>
  </header>
</template>
