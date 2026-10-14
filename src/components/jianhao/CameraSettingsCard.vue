<script setup lang="ts">
import { useI18n } from "vue-i18n"
import CameraDeviceSelect from "@/components/jianhao/CameraDeviceSelect.vue"
import { Switch } from "@/components/ui/switch"

interface CameraDeviceOption {
  deviceId: string
  label: string
}

const props = defineProps<{
  devices: readonly CameraDeviceOption[]
  cameraDeviceId: string
  cameraBlurred: boolean
  detectionPointsVisible: boolean
}>()

const emit = defineEmits<{
  cameraDeviceChange: [deviceId: string]
  cameraBlur: [enabled: boolean]
  detectionPointsVisible: [visible: boolean]
}>()

const { t } = useI18n()
</script>

<template>
  <section class="border-b border-border/60 py-3">
    <h2 class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
      {{ t("settings.cameraViewTitle") }}
    </h2>
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
    <div class="mt-2 grid gap-2">
      <div class="flex min-h-9 items-center justify-between gap-3">
        <div class="min-w-0">
          <span id="camera-blur-label" class="block text-[13px] font-medium">
            {{ t("settings.cameraBlur") }}
          </span>
          <span class="block text-[11px] leading-4 text-muted-foreground">
            {{ t("settings.cameraBlurDescription") }}
          </span>
        </div>
        <Switch
          :model-value="props.cameraBlurred"
          aria-labelledby="camera-blur-label"
          @update:model-value="emit('cameraBlur', $event)"
        />
      </div>
      <div class="flex min-h-9 items-center justify-between gap-3">
        <div class="min-w-0">
          <span id="detection-points-label" class="block text-[13px] font-medium">
            {{ t("settings.detectionPoints") }}
          </span>
          <span class="block text-[11px] leading-4 text-muted-foreground">
            {{ t("settings.detectionPointsDescription") }}
          </span>
        </div>
        <Switch
          :model-value="props.detectionPointsVisible"
          aria-labelledby="detection-points-label"
          @update:model-value="emit('detectionPointsVisible', $event)"
        />
      </div>
    </div>
  </section>
</template>
