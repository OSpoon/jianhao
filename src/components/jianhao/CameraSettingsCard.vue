<script setup lang="ts">
import { useI18n } from "vue-i18n"
import CameraDeviceSelect from "@/components/jianhao/CameraDeviceSelect.vue"

interface CameraDeviceOption {
  deviceId: string
  label: string
}

const props = defineProps<{
  devices: readonly CameraDeviceOption[]
  cameraDeviceId: string
}>()

const emit = defineEmits<{
  cameraDeviceChange: [deviceId: string]
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
  </section>
</template>
