import type { Ref } from "vue"
import type { HealthIssue, Issue } from "@/features/posture/engine/types"
import type { MonitorStatus } from "@/features/posture/usePostureMonitor"
import { invoke } from "@tauri-apps/api/core"
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart"
import { openUrl } from "@tauri-apps/plugin-opener"
import { onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { HEALTH_ISSUE_ORDER } from "@/features/posture/catalog"
import { loadHealthNotifications, saveHealthNotifications } from "@/features/posture/engine/storage"

/** Settings and native system integrations that are independent of the camera view. */
export function useSystemSettings(
  activeHealthIssues: Readonly<Ref<Issue[]>>,
  monitorStatus: Readonly<Ref<MonitorStatus>>,
) {
  const { t, locale } = useI18n()
  const autostartEnabled = ref(false)
  const autostartBusy = ref(false)
  const autostartError = ref("")
  const notificationPermissionBusy = ref(false)
  const notificationFeedback = ref("")
  const systemSettingsFeedback = ref("")
  const healthNotifications = ref<HealthIssue[]>(loadHealthNotifications())

  const healthNotificationSeen = new Set<Issue>()
  let notificationSyncInFlight = false

  async function loadAutostart(): Promise<void> {
    try {
      autostartEnabled.value = await isEnabled()
    }
    catch {
      // Browser preview and platforms without the plugin simply omit this setting.
    }
  }

  async function handleAutostart(value: boolean): Promise<void> {
    const previous = autostartEnabled.value
    autostartError.value = ""
    autostartEnabled.value = value
    autostartBusy.value = true
    try {
      if (value)
        await enable()
      else await disable()
    }
    catch {
      autostartEnabled.value = previous
      autostartError.value = t("settings.autostartFailed")
    }
    finally {
      autostartBusy.value = false
    }
  }

  function healthNotificationBody(issues: Issue[]): string {
    const labels = issues.map(issue => t(`issue.${issue}`))
    const separator = locale.value === "zh-CN" ? "、" : ", "
    return t("settings.healthNotificationBody", { issues: labels.join(separator) })
  }

  async function handleTestNotification(): Promise<void> {
    notificationPermissionBusy.value = true
    notificationFeedback.value = ""
    try {
      const granted = await invoke<boolean>("request_notification_permission")
      if (!granted) {
        notificationFeedback.value = t("settings.notificationDenied")
        return
      }
      await invoke("send_system_notification", {
        title: t("settings.notificationTestTitle"),
        body: t("settings.notificationTestBody"),
      })
      notificationFeedback.value = t("settings.notificationSent")
    }
    catch (error) {
      notificationFeedback.value = t("settings.notificationFailed", { error: String(error) })
    }
    finally {
      notificationPermissionBusy.value = false
    }
  }

  async function handleOpenCameraSettings(): Promise<void> {
    systemSettingsFeedback.value = ""
    try {
      await openUrl("x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Camera")
    }
    catch (error) {
      systemSettingsFeedback.value = t("settings.cameraSettingsFailed", { error: String(error) })
    }
  }

  async function handleOpenNotificationSettings(): Promise<void> {
    systemSettingsFeedback.value = ""
    try {
      await openUrl("x-apple.systempreferences:com.apple.Notifications-Settings.extension?id=com.osp.jianhao")
    }
    catch (error) {
      systemSettingsFeedback.value = t("settings.notificationSettingsFailed", { error: String(error) })
    }
  }

  async function syncHealthNotifications(): Promise<void> {
    if (notificationSyncInFlight)
      return
    const active = activeHealthIssues.value.filter(issue => healthNotifications.value.includes(issue as HealthIssue))
    for (const issue of healthNotificationSeen) {
      if (!active.includes(issue))
        healthNotificationSeen.delete(issue)
    }

    const newlyActive = active.filter(issue => !healthNotificationSeen.has(issue))
    if (newlyActive.length === 0)
      return

    notificationSyncInFlight = true
    try {
      await invoke("send_system_notification", {
        title: t("settings.healthNotificationTitle"),
        body: healthNotificationBody(newlyActive),
      })
      newlyActive.forEach(issue => healthNotificationSeen.add(issue))
    }
    catch (error) {
      notificationFeedback.value = t("settings.healthNotificationFailed", { error: String(error) })
    }
    finally {
      notificationSyncInFlight = false
    }
  }

  function handleHealthNotification(issue: HealthIssue, enabled: boolean): void {
    const next = new Set(healthNotifications.value)
    if (enabled)
      next.add(issue)
    else next.delete(issue)
    healthNotifications.value = HEALTH_ISSUE_ORDER.filter(healthIssue => next.has(healthIssue))
    saveHealthNotifications(healthNotifications.value)
    void syncHealthNotifications()
  }

  onMounted(() => {
    void loadAutostart()
  })

  watch([activeHealthIssues, monitorStatus, healthNotifications, locale], () => {
    void syncHealthNotifications()
  }, { immediate: true })

  return {
    autostartEnabled,
    autostartBusy,
    autostartError,
    notificationPermissionBusy,
    notificationFeedback,
    systemSettingsFeedback,
    healthNotifications,
    handleAutostart,
    handleTestNotification,
    handleOpenCameraSettings,
    handleOpenNotificationSettings,
    handleHealthNotification,
  }
}
