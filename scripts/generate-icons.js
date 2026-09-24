import { execFileSync } from "node:child_process"
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..")
const tauriDir = join(rootDir, "src-tauri")
const iconsDir = join(tauriDir, "icons")
const sourcePath = join(rootDir, "src", "assets", "brand-mark.png")
const configPath = join(tauriDir, "tauri.conf.json")
const tauriCliPath = join(rootDir, "node_modules", "@tauri-apps", "cli", "tauri.js")
const tempDir = mkdtempSync(join(tmpdir(), "jianhao-icons-"))

try {
  const config = JSON.parse(readFileSync(configPath, "utf8"))
  const outputDir = join(tempDir, "production")

  execFileSync(process.execPath, [tauriCliPath, "icon", sourcePath, "--output", outputDir], {
    cwd: rootDir,
    stdio: "inherit",
  })

  for (const configuredPath of config.bundle.icon) {
    const filename = basename(configuredPath)
    copyFileSync(join(outputDir, filename), join(iconsDir, filename))
  }

  const imageData = readFileSync(sourcePath).toString("base64")
  const svgPath = join(tempDir, "macos-dev-icon.svg")
  const macosDevOutputDir = join(tempDir, "macos-dev")
  const inset = 102
  const size = 820
  const cornerRadius = 176
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><clipPath id="mask"><rect x="${inset}" y="${inset}" width="${size}" height="${size}" rx="${cornerRadius}"/></clipPath></defs><image x="${inset}" y="${inset}" width="${size}" height="${size}" href="data:image/png;base64,${imageData}" clip-path="url(#mask)"/></svg>`

  writeFileSync(svgPath, svg)
  execFileSync(process.execPath, [tauriCliPath, "icon", svgPath, "--output", macosDevOutputDir], {
    cwd: rootDir,
    stdio: "inherit",
  })

  copyFileSync(join(macosDevOutputDir, "icon.png"), join(iconsDir, "macos-dev.png"))
  copyFileSync(join(macosDevOutputDir, "icon.icns"), join(iconsDir, "macos-dev.icns"))
}
finally {
  rmSync(tempDir, { force: true, recursive: true })
}
