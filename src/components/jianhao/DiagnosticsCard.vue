<script setup lang="ts">
import { isTauri } from "@tauri-apps/api/core"
import { appLogDir } from "@tauri-apps/api/path"
import { openPath } from "@tauri-apps/plugin-opener"
import { onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { Button } from "@/components/ui/button"

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
  <section class="py-3">
    <h2 class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
      {{ t("settings.logTitle") }}
    </h2>
    <p class="mb-2 text-[11px] leading-4 text-muted-foreground">
      {{ t("settings.logDescription") }}
    </p>
    <div class="flex min-h-9 items-center justify-between gap-3">
      <div class="min-w-0 flex-1">
        <span class="block truncate text-xs font-medium">{{ t("settings.logPath") }}</span>
        <code v-if="directory" :title="directory" class="block truncate text-[11px] leading-4 text-muted-foreground">{{ directory }}</code>
        <span v-else class="block truncate text-[11px] leading-4 text-muted-foreground">{{ t("settings.logPathUnavailable") }}</span>
      </div>
      <Button v-if="desktop" class="h-8 shrink-0 rounded-full px-3 text-xs" variant="outline" :disabled="!directory" @click="openLogDirectory">
        {{ t("settings.openLogDirectory") }}
      </Button>
    </div>
    <p v-if="openError" class="mt-2 text-xs text-destructive" role="alert">
      {{ openError }}
    </p>
  </section>
</template>
