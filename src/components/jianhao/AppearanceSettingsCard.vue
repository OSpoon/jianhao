<script setup lang="ts">
import type { AppLocale } from "@/i18n"
import { useI18n } from "vue-i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useAppearance } from "@/composables/useAppearance"
import { setAppLocale } from "@/i18n"

const { t, locale } = useI18n()
const appearance = useAppearance()

function changeLocale(value: unknown): void {
  if (value === "zh-CN" || value === "en-US")
    setAppLocale(value as AppLocale)
}

function changeAppearance(value: unknown): void {
  if (value === "auto" || value === "light" || value === "dark")
    appearance.value = value
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t("settings.appearanceTitle") }}</CardTitle>
      <CardDescription>{{ t("settings.appearanceDescription") }}</CardDescription>
    </CardHeader>
    <CardContent class="grid gap-4">
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-medium">{{ t("settings.language") }}</span>
        <ToggleGroup
          type="single"
          variant="outline"
          :model-value="locale"
          :aria-label="t('settings.language')"
          @update:model-value="changeLocale"
        >
          <ToggleGroupItem value="zh-CN">
            {{ t("settings.chinese") }}
          </ToggleGroupItem>
          <ToggleGroupItem value="en-US">
            {{ t("settings.english") }}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-medium">{{ t("settings.theme") }}</span>
        <ToggleGroup
          type="single"
          variant="outline"
          :model-value="appearance"
          :aria-label="t('settings.theme')"
          @update:model-value="changeAppearance"
        >
          <ToggleGroupItem value="auto">
            {{ t("settings.system") }}
          </ToggleGroupItem>
          <ToggleGroupItem value="light">
            {{ t("settings.light") }}
          </ToggleGroupItem>
          <ToggleGroupItem value="dark">
            {{ t("settings.dark") }}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </CardContent>
  </Card>
</template>
