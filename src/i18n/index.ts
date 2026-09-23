import { createI18n } from "vue-i18n"
import { messages } from "./messages"

export type AppLocale = keyof typeof messages

function initialLocale(): AppLocale {
  try {
    const saved = localStorage.getItem("jianhao.locale.v1")
    if (saved === "en-US" || saved === "zh-CN")
      return saved
  }
  catch {
    // Fall through to the system language.
  }
  return navigator.language.toLowerCase().startsWith("en") ? "en-US" : "zh-CN"
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: "zh-CN",
  messages,
})

export function setAppLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
  try {
    localStorage.setItem("jianhao.locale.v1", locale)
  }
  catch {
    // The current session still switches language when storage is unavailable.
  }
}

document.documentElement.lang = i18n.global.locale.value
