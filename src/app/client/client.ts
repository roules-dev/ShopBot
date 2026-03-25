import config from "@/../config/config.json" with { type: "json" }
import { PrettyLog } from "@/lib/pretty-log.js"
import { Client, Collection, GatewayIntentBits, Interaction, SlashCommandBuilder } from "discord.js"
import fs from "fs/promises"
import path from "path"

import { EVENTS } from "@/core/events/event-bus.js"
import { fileURLToPath, pathToFileURL } from "node:url"
import { setActivity } from "./status.js"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


interface Command {
    data: SlashCommandBuilder,
    execute: (client: Client, interaction: Interaction, ...args: unknown[]) => Promise<void>
}

declare module "discord.js" {
    export interface Client {
        commands: Collection<string, Command>
    }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences] })


async function registerCommands(client: Client, isTs: boolean = false) {
    client.commands = new Collection()
    const commandsPath = path.join(__dirname, "..", "commands")

    const ext = isTs ? ".ts" : ".js"
    const commandFiles = (await fs.readdir(commandsPath)).filter((file) => file.endsWith(ext))

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file)
        const command: Command = await import(pathToFileURL(filePath).href)

        client.commands.set(command.data.name, command)
    }

    PrettyLog.logLoadStep("Commands registered")
}

async function registerEvents(client: Client, isTs: boolean = false) {
    const eventsPath = path.join(__dirname, "..", "events")

    const ext = isTs ? ".ts" : ".js"
    const eventFiles = (await fs.readdir(eventsPath)).filter((file) => file.endsWith(ext))

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file)
        const event = await import(pathToFileURL(filePath).href)
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args))
        } else {
            client.on(event.name, (...args) => event.execute(...args))
        }
    }

    PrettyLog.logLoadStep("Events registered")
}

export async function startClient(isTs: boolean = false) {
    if (!config.token) {
        PrettyLog.error("Missing token in config.json")
        process.exit(1)
    }

    await registerCommands(client, isTs)
    await registerEvents(client, isTs)

    await client.login(config.token)
}

EVENTS.on("settingUpdated", async (settingId, _) => {
    if (settingId !== "activityMessage" && settingId !== "activityType") return
    setActivity(client)
})