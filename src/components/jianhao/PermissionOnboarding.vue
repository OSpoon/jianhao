<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const props = defineProps<{
  open: boolean
  notificationBusy: boolean
  notificationFeedback: string
  systemSettingsFeedback: string
}>()

const emit = defineEmits<{
  "update:open": [open: boolean]
  "requestCamera": []
  "openCameraSettings": []
  "testNotification": []
  "openNotificationSettings": []
}>()
const { t } = useI18n()
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent data-app-scroll class="max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ t("settings.permissionTitle") }}</DialogTitle>
        <DialogDescription>
          {{ t("settings.permissionDescription") }}
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-3">
        <section class="grid gap-3 rounded-lg border p-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-medium">
                {{ t("settings.camera") }}
              </h3>
              <span class="text-xs text-destructive">{{ t("settings.required") }}</span>
            </div>
            <p class="text-xs text-muted-foreground">
              {{ t("settings.firstCameraRequest") }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button size="sm" @click="emit('requestCamera')">
              {{ t("settings.startAndRequest") }}
            </Button>
            <Button variant="outline" size="sm" @click="emit('openCameraSettings')">
              {{ t("settings.openCameraSettings") }}
            </Button>
          </div>
        </section>

        <section class="grid gap-3 rounded-lg border p-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-medium">
                {{ t("settings.notifications") }}
              </h3>
              <span class="text-xs text-muted-foreground">{{ t("settings.healthPermission") }}</span>
            </div>
            <p class="text-xs text-muted-foreground">
              {{ t("settings.notificationDescription") }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" :disabled="props.notificationBusy" @click="emit('testNotification')">
              {{ props.notificationBusy ? t("settings.sending") : t("settings.testNotification") }}
            </Button>
            <Button variant="outline" size="sm" @click="emit('openNotificationSettings')">
              {{ t("settings.openNotificationSettings") }}
            </Button>
          </div>
        </section>

        <p v-if="props.notificationFeedback" class="text-xs text-muted-foreground" role="status">
          {{ props.notificationFeedback }}
        </p>
        <p v-if="props.systemSettingsFeedback" class="text-xs text-destructive" role="alert">
          {{ props.systemSettingsFeedback }}
        </p>
      </div>

      <DialogFooter>
        <Button variant="ghost" @click="emit('update:open', false)">
          {{ t("settings.later") }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
