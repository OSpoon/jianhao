<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const props = defineProps<{
  notificationBusy: boolean
  notificationFeedback: string
  systemSettingsFeedback: string
}>()

const emit = defineEmits<{
  testNotification: []
  openCameraSettings: []
  openNotificationSettings: []
}>()
const { t } = useI18n()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t("settings.permissionsTitle") }}</CardTitle>
      <CardDescription>{{ t("settings.permissionsDescription") }}</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="grid gap-4">
        <div class="flex items-center justify-between gap-3">
          <div class="space-y-1">
            <p class="text-sm font-medium">
              {{ t("settings.camera") }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ t("settings.cameraPermissionDescription") }}
            </p>
          </div>
          <Button variant="outline" size="sm" @click="emit('openCameraSettings')">
            {{ t("settings.openSettings") }}
          </Button>
        </div>
        <Separator />
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0 space-y-1">
            <p class="text-sm font-medium">
              {{ t("settings.notifications") }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ t("settings.notificationDescription") }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" @click="emit('openNotificationSettings')">
              {{ t("settings.openSettings") }}
            </Button>
            <Button variant="outline" size="sm" :disabled="props.notificationBusy" @click="emit('testNotification')">
              {{ props.notificationBusy ? t("settings.sending") : t("settings.test") }}
            </Button>
          </div>
        </div>
        <p v-if="props.systemSettingsFeedback" class="text-xs text-destructive" role="alert">
          {{ props.systemSettingsFeedback }}
        </p>
        <p v-if="props.notificationFeedback" class="text-xs text-muted-foreground" role="status">
          {{ props.notificationFeedback }}
        </p>
        <p class="text-xs text-muted-foreground">
          {{ t("settings.testNotificationHelp") }}
        </p>
      </div>
    </CardContent>
  </Card>
</template>
