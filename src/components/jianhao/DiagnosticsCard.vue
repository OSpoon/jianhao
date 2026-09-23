<script setup lang="ts">
import { isTauri } from "@tauri-apps/api/core"
import { appLogDir } from "@tauri-apps/api/path"
import { openPath } from "@tauri-apps/plugin-opener"
import { onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const { t } = useI18n()
const directory = ref("")
const desktop = isTauri()
const openError = ref("")

onMounted(async () => {
  if (!desktop)
    return
  try {
    directory.value = await appLogDir()
  }
  catch {
    directory.value = ""
  }
})

async function openLogDirectory(): Promise<void> {
  if (!directory.value)
    return
  openError.value = ""
  try {
    await openPath(directory.value)
  }
  catch (error) {
    openError.value = t("settings.logOpenFailed", { error: String(error) })
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t("settings.logTitle") }}</CardTitle>
      <CardDescription>{{ t("settings.logDescription") }}</CardDescription>
    </CardHeader>
    <CardContent class="grid gap-3">
      <div class="grid gap-1">
        <span class="text-sm font-medium">{{ t("settings.logPath") }}</span>
        <code v-if="directory" class="break-all text-xs text-muted-foreground">{{ directory }}</code>
        <span v-else class="text-xs text-muted-foreground">{{ t("settings.logPathUnavailable") }}</span>
      </div>
      <Button v-if="desktop" class="w-fit" variant="outline" size="sm" :disabled="!directory" @click="openLogDirectory">
        {{ t("settings.openLogDirectory") }}
      </Button>
      <p v-if="openError" class="text-xs text-destructive" role="alert">
        {{ openError }}
      </p>
    </CardContent>
  </Card>
</template>
