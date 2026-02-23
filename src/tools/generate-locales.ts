import { PrettyLog } from "@/lib/pretty-log.js"
import fs from "fs"
import path from "path"

const inputDir = path.resolve("locales")
const outputDir = path.resolve("src/generated/locales")

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
}

const files = fs.readdirSync(inputDir).filter(f => f.endsWith(".json"))

for (const file of files) {
    const name = file.replace(".json", "")
    const jsonPath = path.join(inputDir, file)
    const tsPath = path.join(outputDir, `${name}.ts`)

    const raw = fs.readFileSync(jsonPath, "utf-8")
    const parsed = JSON.parse(raw)

    const content = `//! AUTO-GENERATED FILE — DO NOT EDIT
export const locale = ${JSON.stringify(parsed, null, 4)} as const
export default locale
`

    fs.writeFileSync(tsPath, content)
}

PrettyLog.success("Locales generated")
