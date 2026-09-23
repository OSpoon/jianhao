<script setup lang="ts">
import { inject } from "vue"
import AppearanceSettingsCard from "@/components/jianhao/AppearanceSettingsCard.vue"
import DetectionRangeCard from "@/components/jianhao/DetectionRangeCard.vue"
import DiagnosticsCard from "@/components/jianhao/DiagnosticsCard.vue"
import MacPermissionsCard from "@/components/jianhao/MacPermissionsCard.vue"
import ReminderSettingsCard from "@/components/jianhao/ReminderSettingsCard.vue"
import { jianhaoAppKey } from "@/features/app/context"

const app = inject(jianhaoAppKey)

if (!app) {
  throw new Error("Jianhao app state was not provided")
}
</script>

<template>
  <div data-app-scroll class="min-h-0 flex-1 overflow-y-auto">
    <section class="mx-auto flex w-full max-w-[460px] flex-col gap-4 px-4 py-4">
      <AppearanceSettingsCard />
      <DiagnosticsCard />
      <DetectionRangeCard
        :monitor="app.monitor"
        :selected-issues="app.menuBarIssues.value"
        :enabled-health-notifications="app.healthNotifications.value"
        @toggle-menu-bar-issue="app.handleMenuBarIssue"
        @toggle-health-notification="app.handleHealthNotification"
      />
      <ReminderSettingsCard
        :sensitivity="app.monitor.sensitivity.value"
        :sound-enabled="app.monitor.soundEnabled.value"
        :autostart-enabled="app.autostartEnabled.value"
        :autostart-busy="app.autostartBusy.value"
        :autostart-error="app.autostartError.value"
        @sensitivity="app.handleSensitivity"
        @sound="app.handleSound"
        @autostart="app.handleAutostart"
      />
      <MacPermissionsCard
        :notification-busy="app.notificationPermissionBusy.value"
        :notification-feedback="app.notificationFeedback.value"
        :system-settings-feedback="app.systemSettingsFeedback.value"
        @test-notification="app.handleTestNotification"
        @open-camera-settings="app.handleOpenCameraSettings"
        @open-notification-settings="app.handleOpenNotificationSettings"
      />
    </section>
  </div>
</template>
