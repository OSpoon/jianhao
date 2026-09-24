<script setup lang="ts">
import type { CameraFrameShape } from "@/features/posture/engine/storage"
import { useI18n } from "vue-i18n"
import CameraDeviceSelect from "@/components/jianhao/CameraDeviceSelect.vue"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface CameraDeviceOption {
  deviceId: string
  label: string
}

const props = defineProps<{
  frameShape: CameraFrameShape
  devices: readonly CameraDeviceOption[]
  cameraDeviceId: string
}>()

const emit = defineEmits<{
  frameShapeChange: [shape: CameraFrameShape]
  cameraDeviceChange: [deviceId: string]
}>()

const { t } = useI18n()

function changeFrameShape(value: unknown): void {
  if (value === "rounded" || value === "circle")
    emit("frameShapeChange", value)
}
</script>

<template>
  <section class="border-b border-border/60 py-3">
    <h2 class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
      {{ t("settings.cameraViewTitle") }}
    </h2>
    <div class="grid gap-2">
      <div class="flex min-h-9 items-center justify-between gap-3">
        <span class="text-[13px] font-medium">{{ t("home.cameraDevice") }}</span>
        <div class="w-[min(220px,68%)] shrink-0">
          <CameraDeviceSelect
            :devices="props.devices"
            :device-id="props.cameraDeviceId"
            @device-change="emit('cameraDeviceChange', $event)"
          />
        </div>
      </div>
      <div class="flex min-h-9 items-center justify-between gap-3">
        <span class="text-[13px] font-medium">{{ t("settings.previewShape") }}</span>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          class="shrink-0 overflow-hidden rounded-full border border-input bg-background"
          :model-value="frameShape"
          :aria-label="t('settings.previewShape')"
          @update:model-value="changeFrameShape"
        >
          <ToggleGroupItem value="rounded" class="whitespace-nowrap border-0 px-3 text-xs data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
            {{ t("settings.previewRounded") }}
          </ToggleGroupItem>
          <ToggleGroupItem value="circle" class="whitespace-nowrap border-0 px-3 text-xs data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
            {{ t("settings.previewCircle") }}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  </section>
</template>
