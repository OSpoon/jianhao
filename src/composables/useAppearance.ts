import { useColorMode } from "@vueuse/core"

let colorMode: ReturnType<typeof useColorMode> | null = null

export function useAppearance() {
  colorMode ??= useColorMode({
    attribute: "class",
    selector: "html",
    storageKey: "jianhao.appearance.v1",
    initialValue: "auto",
    emitAuto: true,
    disableTransition: true,
  })

  return colorMode.store
}
