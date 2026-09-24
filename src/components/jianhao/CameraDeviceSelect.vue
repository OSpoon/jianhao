<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CameraDeviceOption {
  deviceId: string
  label: string
}

const props = defineProps<{
  devices: readonly CameraDeviceOption[]
  deviceId: string
}>()

const emit = defineEmits<{
  deviceChange: [deviceId: string]
}>()

const DEFAULT_CAMERA_VALUE = "__default_camera__"
const NO_CAMERAS_VALUE = "__no_camera__"
const { t } = useI18n()
const selectableDevices = computed(() =>
  props.devices.filter(device => device.deviceId),
)
const selectedDeviceUnavailable = computed(
  () =>
    !!props.deviceId
    && !selectableDevices.value.some(
      device => device.deviceId === props.deviceId,
    ),
)
const selectedDeviceValue = computed(
  () => props.deviceId || DEFAULT_CAMERA_VALUE,
)
const selectedDeviceLabel = computed(() => {
  if (selectedDeviceUnavailable.value)
    return t("home.cameraUnavailable")

  const index = selectableDevices.value.findIndex(
    device => device.deviceId === props.deviceId,
  )
  if (index >= 0) {
    const device = selectableDevices.value[index]
    return device.label || t("home.cameraNumber", { number: index + 1 })
  }

  return t("home.cameraDefault")
})

function changeDevice(value: unknown): void {
  if (typeof value === "string")
    emit("deviceChange", value === DEFAULT_CAMERA_VALUE ? "" : value)
}
</script>

<template>
  <Select :model-value="selectedDeviceValue" @update:model-value="changeDevice">
    <SelectTrigger
      :aria-label="t('home.cameraDevice')"
      :title="selectedDeviceLabel"
      class="h-8 w-full rounded-xl border-white/20 bg-black/20 px-3 text-xs text-white shadow-none hover:bg-black/30 focus-visible:ring-white/60 dark:bg-black/20"
    >
      <SelectValue :placeholder="t('home.cameraDevice')" />
    </SelectTrigger>
    <SelectContent
      position="popper"
      side="bottom"
      align="center"
      :side-offset="4"
      class="max-h-36 w-[min(360px,calc(100vw-24px))] whitespace-nowrap"
    >
      <SelectItem
        :value="DEFAULT_CAMERA_VALUE"
        :title="t('home.cameraDefault')"
        class="min-w-0 whitespace-nowrap"
      >
        <span class="block min-w-0 truncate">{{
          t("home.cameraDefault")
        }}</span>
      </SelectItem>
      <SelectItem
        v-if="selectedDeviceUnavailable"
        :value="deviceId"
        :title="t('home.cameraUnavailable')"
        class="min-w-0 whitespace-nowrap"
      >
        <span class="block min-w-0 truncate">{{
          t("home.cameraUnavailable")
        }}</span>
      </SelectItem>
      <SelectItem
        v-for="(device, index) in selectableDevices"
        :key="device.deviceId"
        :value="device.deviceId"
        :title="device.label || t('home.cameraNumber', { number: index + 1 })"
        class="min-w-0 whitespace-nowrap"
      >
        <span class="block min-w-0 truncate">
          {{ device.label || t("home.cameraNumber", { number: index + 1 }) }}
        </span>
      </SelectItem>
      <SelectItem
        v-if="selectableDevices.length === 0"
        :value="NO_CAMERAS_VALUE"
        :title="t('home.cameraNoDevices')"
        disabled
        class="min-w-0 whitespace-nowrap"
      >
        <span class="block min-w-0 truncate">{{
          t("home.cameraNoDevices")
        }}</span>
      </SelectItem>
    </SelectContent>
  </Select>
</template>
