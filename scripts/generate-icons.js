#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * 图标生成脚本
 * 从源 LOGO 文件生成所有需要的图标尺寸和格式
 */

import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, "..")
const iconsDir = join(rootDir, "src-tauri", "icons")
const sourceLogo = join(rootDir, "logo.png")

// 检查源文件是否存在
if (!existsSync(sourceLogo)) {
  console.error("❌ 源 LOGO 文件不存在:", sourceLogo)
  console.error("   请确保 logo.png 文件位于项目根目录")
  process.exit(1)
}

console.log("🎨 开始生成图标文件...\n")

// 需要生成的 PNG 尺寸列表
const pngSizes = [
  { name: "32x32.png", size: 32 },
  { name: "128x128.png", size: 128 },
  { name: "128x128@2x.png", size: 256 },
  { name: "icon.png", size: 512 },
  { name: "Square30x30Logo.png", size: 30 },
  { name: "Square44x44Logo.png", size: 44 },
  { name: "Square71x71Logo.png", size: 71 },
  { name: "Square89x89Logo.png", size: 89 },
  { name: "Square107x107Logo.png", size: 107 },
  { name: "Square142x142Logo.png", size: 142 },
  { name: "Square150x150Logo.png", size: 150 },
  { name: "Square284x284Logo.png", size: 284 },
  { name: "Square310x310Logo.png", size: 310 },
  { name: "StoreLogo.png", size: 1024 },
]

// 检查图像处理工具
async function detectImageTool() {
  try {
    // 优先使用 sharp (Node.js 原生，无需系统依赖)
    const sharp = await import("sharp")
    if (sharp) {
      return { useSharp: true, useImageMagick: false }
    }
  }
  catch {
    // 回退到 ImageMagick
    try {
      execSync("which convert", { stdio: "ignore" })
      return { useSharp: false, useImageMagick: true }
    }
    catch {
      console.error("❌ 未找到图像处理工具！")
      console.error("请安装 sharp: pnpm add -D sharp")
      console.error("或者安装 ImageMagick: brew install imagemagick (macOS)")
      process.exit(1)
    }
  }
  return { useSharp: false, useImageMagick: false }
}

// 生成 PNG 文件
async function generatePNG(name, size, imageTool) {
  const outputPath = join(iconsDir, name)

  if (imageTool.useSharp) {
    try {
      const sharp = (await import("sharp")).default
      await sharp(sourceLogo)
        .resize(size, size, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(outputPath)
      return true
    }
    catch (error) {
      console.error(`  ❌ 生成 ${name} 失败:`, error.message)
      return false
    }
  }
  else if (imageTool.useImageMagick) {
    try {
      execSync(
        `convert "${sourceLogo}" -resize ${size}x${size} -background none -gravity center -extent ${size}x${size} "${outputPath}"`,
        { stdio: "ignore" },
      )
      return true
    }
    catch (error) {
      console.error(`  ❌ 生成 ${name} 失败`)
      return false
    }
  }
  return false
}

// 生成 ICNS 文件 (macOS)
async function generateICNS(imageTool) {
  const outputPath = join(iconsDir, "icon.icns")

  // macOS 需要 iconutil 工具
  try {
    execSync("which iconutil", { stdio: "ignore" })
  }
  catch {
    console.warn("  ⚠️  ICNS 生成需要 macOS 系统的 iconutil 工具")
    return false
  }

  try {
    // 创建临时目录和不同尺寸的图标
    const tempDir = join(iconsDir, "icon.iconset")
    execSync(`rm -rf "${tempDir}"`, { stdio: "ignore" })
    execSync(`mkdir -p "${tempDir}"`, { stdio: "ignore" })

    const sizes = [16, 32, 64, 128, 256, 512, 1024]

    if (imageTool.useSharp) {
      const sharp = (await import("sharp")).default
      // 使用 sharp 生成所有尺寸
      for (const size of sizes) {
        const size2x = size * 2
        // 1x 尺寸
        await sharp(sourceLogo)
          .resize(size, size, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toFile(`${tempDir}/icon_${size}x${size}.png`)
        // 2x 尺寸
        await sharp(sourceLogo)
          .resize(size2x, size2x, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toFile(`${tempDir}/icon_${size}x${size}@2x.png`)
      }
    }
    else if (imageTool.useImageMagick) {
      // 使用 ImageMagick 生成所有尺寸
      for (const size of sizes) {
        const size2x = size * 2
        execSync(
          `convert "${sourceLogo}" -resize ${size}x${size} -background none -gravity center -extent ${size}x${size} "${tempDir}/icon_${size}x${size}.png"`,
          { stdio: "ignore" },
        )
        execSync(
          `convert "${sourceLogo}" -resize ${size2x}x${size2x} -background none -gravity center -extent ${size2x}x${size2x} "${tempDir}/icon_${size}x${size}@2x.png"`,
          { stdio: "ignore" },
        )
      }
    }
    else {
      console.warn("  ⚠️  需要图像处理工具来生成 ICNS")
      return false
    }

    // 使用 iconutil 生成 ICNS (macOS only)
    execSync(`iconutil -c icns "${tempDir}" -o "${outputPath}"`, { stdio: "ignore" })
    execSync(`rm -rf "${tempDir}"`, { stdio: "ignore" })
    return true
  }
  catch (error) {
    console.error("  ❌ 生成 icon.icns 失败:", error.message)
    return false
  }
}

// 生成 ICO 文件 (Windows)
async function generateICO(imageTool) {
  const outputPath = join(iconsDir, "icon.ico")

  if (imageTool.useImageMagick) {
    try {
      // ICO 文件需要多个尺寸
      execSync(
        `convert "${sourceLogo}" -define icon:auto-resize=256,128,64,48,32,16 "${outputPath}"`,
        { stdio: "ignore" },
      )
      return true
    }
    catch (error) {
      console.error("  ❌ 生成 icon.ico 失败")
      return false
    }
  }
  else {
    // sharp 不支持直接生成 ICO，尝试使用 toIco 或提示用户
    console.warn("  ⚠️  ICO 生成需要 ImageMagick，跳过 ICO 生成")
    console.warn("     可以手动使用在线工具或 ImageMagick 生成")
    return false
  }
}

// 主函数
async function main() {
  // 检测图像处理工具
  const imageTool = await detectImageTool()
  if (imageTool.useSharp) {
    console.log("✓ 使用 sharp 处理图像\n")
  }
  else if (imageTool.useImageMagick) {
    console.log("✓ 使用 ImageMagick 处理图像\n")
  }

  console.log(`📦 使用源文件: ${sourceLogo}\n`)
  console.log("📦 生成 PNG 文件...")
  let successCount = 0
  for (const { name, size } of pngSizes) {
    if (await generatePNG(name, size, imageTool)) {
      console.log(`  ✓ ${name} (${size}x${size})`)
      successCount++
    }
  }
  console.log(`\n✓ 成功生成 ${successCount}/${pngSizes.length} 个 PNG 文件\n`)

  console.log("🍎 生成 ICNS 文件 (macOS)...")
  if (await generateICNS(imageTool)) {
    console.log("  ✓ icon.icns\n")
  }

  console.log("🪟 生成 ICO 文件 (Windows)...")
  if (await generateICO(imageTool)) {
    console.log("  ✓ icon.ico\n")
  }

  console.log("✨ 图标生成完成！")
}

main().catch((error) => {
  console.error("❌ 生成图标时出错:", error)
  process.exit(1)
})
