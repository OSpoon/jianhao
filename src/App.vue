<script setup lang="ts">
import { onBeforeUnmount, onMounted, provide, ref } from "vue"
import PermissionOnboarding from "@/components/jianhao/PermissionOnboarding.vue"
import WindowToolbar from "@/components/jianhao/WindowToolbar.vue"
import { useAppearance } from "@/composables/useAppearance"
import { jianhaoAppKey } from "@/features/app/context"
import { useJianhaoApp } from "@/features/app/useJianhaoApp"
import logoUrl from "./assets/brand-mark.png"

const sourceVideo = ref<HTMLVideoElement | null>(null)
const previewVideo = ref<HTMLVideoElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
useAppearance()
const appState = useJianhaoApp(sourceVideo, previewVideo, canvas)
const permissionGuideOpen = ref(false)
const PERMISSION_GUIDE_KEY = "jianhao.permission-guide.dismissed.v1"

function dismissPermissionGuide(): void {
  permissionGuideOpen.value = false
  try {
    localStorage.setItem(PERMISSION_GUIDE_KEY, "true")
  }
  catch {
    // The guide still closes if local storage is unavailable.
  }
}

function handlePermissionGuideOpenChange(open: boolean): void {
  if (open)
    permissionGuideOpen.value = true
  else dismissPermissionGuide()
}

function requestCameraFromGuide(): void {
  dismissPermissionGuide()
  appState.handleStart()
}

function preventPageCopy(event: ClipboardEvent): void {
  const target = event.target
  if (target instanceof Element && target.closest("input, textarea, [contenteditable]:not([contenteditable='false']), [role='textbox']")) {
    return
  }

  event.preventDefault()
}

onMounted(() => {
  document.addEventListener("copy", preventPageCopy, true)
  try {
    permissionGuideOpen.value = localStorage.getItem(PERMISSION_GUIDE_KEY) !== "true"
  }
  catch {
    permissionGuideOpen.value = true
  }
})

onBeforeUnmount(() => {
  document.removeEventListener("copy", preventPageCopy, true)
})

provide(jianhaoAppKey, appState)
</script>

<template>
  <main class="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
    <WindowToolbar :logo-url="logoUrl" />

    <PermissionOnboarding
      :open="permissionGuideOpen"
      :notification-busy="appState.notificationPermissionBusy.value"
      :notification-feedback="appState.notificationFeedback.value"
      :system-settings-feedback="appState.systemSettingsFeedback.value"
      @update:open="handlePermissionGuideOpenChange"
      @request-camera="requestCameraFromGuide"
      @open-camera-settings="appState.handleOpenCameraSettings"
      @test-notification="appState.handleTestNotification"
      @open-notification-settings="appState.handleOpenNotificationSettings"
    />

    <video
      ref="sourceVideo"
      class="pointer-events-none fixed left-0 top-0 size-px opacity-0"
      autoplay
      muted
      playsinline
      aria-hidden="true"
    />

    <RouterView />
  </main>
</template>
