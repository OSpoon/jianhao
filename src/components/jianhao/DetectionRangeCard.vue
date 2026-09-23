<script setup lang="ts">
import type { HealthIssue, Issue } from "@/features/posture/engine/types"
import type { PostureMonitor } from "@/features/posture/usePosturePresentation"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import {
  HEALTH_ISSUE_ORDER,
  ISSUE_GROUPS,
  ISSUE_ICONS,
  MENU_BAR_ISSUES,
} from "@/features/posture/catalog"
import {

  usePosturePresentation,
} from "@/features/posture/usePosturePresentation"

const props = defineProps<{
  monitor: PostureMonitor
  selectedIssues: readonly Issue[]
  enabledHealthNotifications: readonly HealthIssue[]
}>()

const emit = defineEmits<{
  toggleMenuBarIssue: [issue: Issue, enabled: boolean]
  toggleHealthNotification: [issue: HealthIssue, enabled: boolean]
}>()

const { t } = useI18n()
const presentation = usePosturePresentation(props.monitor)

function isHealthIssue(issue: Issue): issue is HealthIssue {
  return HEALTH_ISSUE_ORDER.includes(issue as HealthIssue)
}

const groups = computed(() =>
  ISSUE_GROUPS.map(group => ({
    ...group,
    hasMenuBarOptions: group.issues.some(issue =>
      MENU_BAR_ISSUES.includes(issue),
    ),
    hasNotificationOptions: group.issues.some(isHealthIssue),
    rows: group.issues.map(issue => ({
      issue,
      healthIssue: isHealthIssue(issue) ? issue : undefined,
      label: t(`issue.${issue}`),
      icon: ISSUE_ICONS[issue],
      readout: presentation.issueReadout(issue),
      progress: presentation.issueProgress(issue),
    })),
  })),
)
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t("settings.detectionTitle") }}</CardTitle>
      <CardDescription>
        {{
          t("settings.detectionDescription")
        }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div class="grid gap-4">
        <div v-for="group in groups" :key="group.label" class="grid gap-2">
          <div class="flex items-center justify-between gap-2 px-2">
            <p
              class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              {{ t(group.label) }}
            </p>
            <span
              v-if="group.hasMenuBarOptions"
              class="text-xs tabular-nums text-muted-foreground"
            >
              {{ t("settings.menuBarColumn") }} ·
              {{ props.selectedIssues.length }}/3
            </span>
            <span
              v-else-if="group.hasNotificationOptions"
              class="text-xs text-muted-foreground"
            >
              {{ t("settings.notificationColumn") }}
            </span>
          </div>
          <div class="grid gap-1">
            <div
              v-for="row in group.rows"
              :key="row.issue"
              class="flex min-w-0 items-center gap-3 rounded-md px-2 py-2"
            >
              <img
                :src="row.icon"
                class="size-5 shrink-0 object-contain opacity-70 dark:invert"
                alt=""
                aria-hidden="true"
              >
              <span class="min-w-0 flex-1 space-y-1">
                <span class="flex items-center justify-between gap-2 text-sm">
                  <span class="shrink-0">{{ row.label }}</span>
                  <span
                    class="whitespace-nowrap text-xs tabular-nums text-muted-foreground"
                  >{{ row.readout }}</span>
                </span>
                <Progress
                  :model-value="row.progress"
                  :aria-label="t('settings.progressAria', { issue: row.label })"
                />
              </span>
              <Switch
                v-if="group.hasMenuBarOptions"
                :model-value="props.selectedIssues.includes(row.issue)"
                :disabled="
                  !props.selectedIssues.includes(row.issue)
                    && props.selectedIssues.length >= 3
                "
                :aria-label="
                  t('settings.menuBarIssueAria', { issue: row.label })
                "
                @update:model-value="
                  (enabled) => emit('toggleMenuBarIssue', row.issue, enabled)
                "
              />
              <Switch
                v-else-if="row.healthIssue"
                :model-value="props.enabledHealthNotifications.includes(row.healthIssue)"
                :aria-label="t('settings.healthNotificationAria', { issue: row.label })"
                @update:model-value="
                  (enabled) => emit('toggleHealthNotification', row.healthIssue!, enabled)
                "
              />
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
