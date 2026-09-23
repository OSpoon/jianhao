<script setup lang="ts">
import type { Sensitivity } from "@/features/posture/engine/types"
import { useI18n } from "vue-i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const props = defineProps<{
  sensitivity: Sensitivity
  soundEnabled: boolean
  autostartEnabled: boolean
  autostartBusy: boolean
  autostartError: string
}>()
const emit = defineEmits<{
  sensitivity: [value: Sensitivity]
  sound: [enabled: boolean]
  autostart: [enabled: boolean]
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

function handleSound(value: unknown): void {
  if (value === "on")
    emit("sound", true)
  if (value === "off")
    emit("sound", false)
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t("settings.reminderTitle") }}</CardTitle>
      <CardDescription>{{ t("settings.reminderDescription") }}</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="grid gap-4">
        <div class="flex items-center justify-between gap-4">
          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t("settings.sensitivity") }}</span>
            <p class="text-xs text-muted-foreground">
              {{ t("settings.sensitivityDescription") }}
            </p>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            :model-value="props.sensitivity"
            :aria-label="t('settings.sensitivity')"
            @update:model-value="handleSensitivity"
          >
            <ToggleGroupItem v-for="option in sensitivityOptions" :key="option.value" :value="option.value">
              {{ t(`settings.${option.value}`) }}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Separator />
        <div class="flex items-center justify-between gap-4">
          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t("settings.sound") }}</span>
            <p class="text-xs text-muted-foreground">
              {{ t("settings.soundDescription") }}
            </p>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            :model-value="props.soundEnabled ? 'on' : 'off'"
            :aria-label="t('settings.sound')"
            @update:model-value="handleSound"
          >
            <ToggleGroupItem value="on">
              {{ t("settings.soundOn") }}
            </ToggleGroupItem>
            <ToggleGroupItem value="off">
              {{ t("settings.soundOff") }}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <Separator />
        <div class="flex items-center justify-between gap-4">
          <div class="space-y-1">
            <span class="text-sm font-medium">{{ t("settings.autostart") }}</span>
            <p class="text-xs text-muted-foreground">
              {{ t("settings.autostartDescription") }}
            </p>
          </div>
          <Switch :model-value="props.autostartEnabled" :disabled="props.autostartBusy" @update:model-value="$emit('autostart', $event)" />
        </div>
        <p v-if="props.autostartError" class="text-xs text-destructive" role="alert">
          {{ props.autostartError }}
        </p>
      </div>
    </CardContent>
  </Card>
</template>
