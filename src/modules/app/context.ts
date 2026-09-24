import type { InjectionKey } from "vue"
import type { useJianhaoApp } from "@/modules/app/useJianhaoApp"

export type JianhaoAppState = ReturnType<typeof useJianhaoApp>

export const jianhaoAppKey: InjectionKey<JianhaoAppState> = Symbol("jianhaoApp")
