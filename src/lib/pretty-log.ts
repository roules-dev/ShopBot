import fs from "node:fs/promises"
import { now } from "./now/now.js"

const LOG_FILE_PATH = "./logs.txt"

const INVERT  = "\x1b[7m"
const GREEN_FG = "\x1b[32m"
const YELLOW_FG = "\x1b[33m"
const BLUE_FG = "\x1b[34m"
const RED_FG = "\x1b[31m"
const RESET = "\x1b[0m"

export class PrettyLog {
    private static loadStepCount = 1
    static logLoadStep(message: string, more?: string) {
        console.log(`${this.stepX()} ${GREEN_FG}${message}${RESET} ${BLUE_FG}${more != undefined ? more : ""}${RESET}`)

        this.saveLogs(`✓ Step ${this.loadStepCount - 1} - ${message} ${more != undefined ? more : ""}`)
    }
    
    static logLoadSuccess() {
        console.log(`\n${INVERT} ✓ ${GREEN_FG} Loading finished after ${this.loadStepCount - 1} steps ${RESET}\n`)
        
        this.saveLogs(`✓ Loading finished after ${this.loadStepCount - 1} steps`)

        this.loadStepCount = 1
    }

    static error(message: string, save = true) {
        console.log(`${INVERT} ✕ ${RED_FG} Error ${RESET} ${RED_FG}${message}${RESET}`)

        if (!save) return
        this.saveLogs(`✕ Error - ${message}`)
    }
    
    static warn(message: string, save = true) {
        console.log(`${INVERT} ! ${YELLOW_FG} Warning ${RESET} ${YELLOW_FG}${message}${RESET}`)

        if (!save) return
        this.saveLogs(`! Warning - ${message}`)
    }

    static info(message: string, save = true) {
        console.log(`${INVERT} ? ${BLUE_FG} Info ${RESET} ${message}`)

        if (!save) return
        this.saveLogs(`? Info - ${message}`)
    }

    static success(message: string, save = true) {
        console.log(`${INVERT} ✓ ${GREEN_FG} Success ${RESET} ${GREEN_FG}${message}${RESET}`)

        if (!save) return
        this.saveLogs(`✓ Success - ${message}`)
    }
    
    static stepX(): string{
        this.loadStepCount ++
        return `${INVERT} ✓ ${GREEN_FG} Step ${this.loadStepCount - 1} ${RESET}`
    }

    static bold(message: string): string {
        const BOLD = "\x1b[1m"
        return `${BOLD}${message}${RESET}`
    }

    static underline(message: string): string {
        const UNDERLINE = "\x1b[4m"
        return `${UNDERLINE}${message}${RESET}`
    }

    static italic(message: string): string {
        const ITALIC = "\x1b[3m"
        return `${ITALIC}${message}${RESET}`
    }

    private static writeLock: Promise<void> = Promise.resolve()

    private static async saveLogs(message: string) {
        this.writeLock = this.writeLock.then(async () => {
            try {
                const sanatizedMessage = message.replace(new RegExp(/\\x1b\[\d+m/, "gm"), "")
                await fs.appendFile(LOG_FILE_PATH, `[${now()}] ${sanatizedMessage}\n`)
            } catch (e) {
                throw e instanceof Error
                    ? e
                    : new Error(`Unknown error while saving logs`)
            }
        })

        try {
            await this.writeLock
        } catch (error) {
            console.log(`Failed to save logs: ${error}`)
        }
    }
}


export function drawProgressBar(progress: number, barWidth = 30) {
    const filledWidth = Math.floor(progress / 100 * barWidth)
    const emptyWidth = barWidth - filledWidth
    const progressBar = "█".repeat(filledWidth) + "▒".repeat(emptyWidth)
    process.stdout.write(`\r[${progressBar}] ${progress.toFixed(0)}%  `)
}