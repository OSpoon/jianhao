<script setup lang="ts">
import type { Sensitivity } from "@/features/posture/engine/types"
import { useI18n } from "vue-i18n"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const props = defineProps<{
  sensitivity: Sensitivity
  keepScreenAwake: boolean
}>()
const emit = defineEmits<{
  sensitivity: [value: Sensitivity]
  keepScreenAwake: [enabled: boolean]
}>()

const { t } = useI18n()

const sensitivityOptions: Array<{ value: Sensitivity }> = [
  { value: "low" },
  { value: "normal" },
  { value: "high" },
]

function handleSensitivity(value: unknown): void {
  if (typeof value !== "string")
    return
  if (value === "low" || value === "normal" || value === "high") {
    emit("sensitivity", value)
  }
}
</script>

<template>
  <section class="border-b border-border/60 py-3">
    <h2 class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
      {{ t("settings.monitoringTitle") }}
    </h2>
    <div class="grid gap-2">
      <div class="flex min-h-9 items-center justify-between gap-3">
        <span class="text-[13px] font-medium">{{
          t("settings.sensitivity")
        }}</span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          class="shrink-0 overflow-hidden rounded-full border border-input bg-background"
          :model-value="props.sensitivity"
          :aria-label="t('settings.sensitivity')"
          @update:model-value="handleSensitivity"
        >
          <ToggleGroupItem
            v-for="option in sensitivityOptions"
            :key="option.value"
            :value="option.value"
            class="whitespace-nowrap border-0 px-3 text-xs data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
          >
            {{ t(`settings.${option.value}`) }}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div
        class="flex items-start justify-between gap-3 border-t border-border/60 pt-3"
      >
        <div class="grid min-w-0 gap-1">
          <span class="text-[13px] font-medium">{{
            t("settings.keepScreenAwake")
          }}</span>
        </div>
        <Switch
          class="mt-0.5 shrink-0"
          :checked="props.keepScreenAwake"
          :aria-label="t('settings.keepScreenAwake')"
          @update:checked="emit('keepScreenAwake', $event)"
        />
      </div>
    </div>
  </section>
</template>
