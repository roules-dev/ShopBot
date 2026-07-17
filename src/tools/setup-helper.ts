import { appDeployCommands } from "@/app/deploy-commands.js"
import { loadAndParseEnv, saveEnvFile } from "@/lib/env/dotenv-handler.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import fs from "node:fs/promises"
import readline from "node:readline"

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

const databasesPaths = [
    "./data/shops.json",
    "./data/accounts.json",
    "./data/currencies.json",
    "./data/items.json",
]

async function setup() {
    const env = loadAndParseEnv()

    console.log("\n\n———————————————————————————\n")
    PrettyLog.info("Dependencies installed, please enter your bot credentials", false)

    const id = await questionWithCondition(`\nBot client ID: `, id => /^\d{17,20}$/.test(id), "Client ID not valid")
    env["CLIENT_ID"] = id

    const token = await questionWithCondition(`\nBot token: `, token => token.length > 0, "Please enter a token")
    env["TOKEN"] = token

    const resetData = await questionWithCondition(
        "\nReset data? (y/n): ", 
        answer => answer.toLocaleLowerCase() === "y" || answer.toLocaleLowerCase() === "n"
    )

    if (resetData.toLocaleLowerCase() === "y") {
        for (const path of databasesPaths) {
            await fs.writeFile(path, JSON.stringify({}, null, 4))
        }
    }

    saveEnvFile(env)
    PrettyLog.success("Configuration saved", false)

    rl.close()
    
    console.log("\n———————————————————————————\n")
    PrettyLog.info("Deploying commands", false)
    await appDeployCommands()
    
    console.log("\n———————————————————————————\n")
    
    PrettyLog.success("Setup complete", false)
    PrettyLog.info(`You can now start the bot using ${PrettyLog.italic("npm run serve")}`, false)
}

setup()


function questionWithCondition(question: string, condition: (answer: string) => boolean, errorMessage?: string) {
    return new Promise<string>(resolve => {
        rl.question(question, answer => {
            if (condition(answer)) {
                resolve(answer)
            } else {
                PrettyLog.warn(errorMessage ?? "Answer not valid", false)
                resolve(questionWithCondition(question, condition, errorMessage))
            }
        })
    })
}
