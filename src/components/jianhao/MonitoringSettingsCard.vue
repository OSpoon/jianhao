<script setup lang="ts">
import type { Sensitivity } from "@/modules/posture/engine/types"
import { useI18n } from "vue-i18n"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const props = defineProps<{
  sensitivity: Sensitivity
}>()
const emit = defineEmits<{
  sensitivity: [value: Sensitivity]
}>()

const { t } = useI18n()

const sensitivityOptions: Sensitivity[] = ["low", "normal", "high"]

function handleSensitivity(value: unknown): void {
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
            :key="option"
            :value="option"
            class="whitespace-nowrap border-0 px-3 text-xs data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
          >
            {{ t(`settings.${option}`) }}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  </section>
</template>
