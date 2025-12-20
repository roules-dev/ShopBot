import fs from 'fs/promises'
import path from 'node:path'

import { Client, Collection, GatewayIntentBits, Interaction, SlashCommandBuilder } from 'discord.js'
import config from '../config/config.json' with { type: 'json' }
import { LocaleStrings } from './utils/localisation.js'
import { PrettyLog } from './utils/pretty-log.js'
import './utils/strings.js'

import { fileURLToPath, pathToFileURL } from 'node:url'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


interface Command {
	data: SlashCommandBuilder,
	execute: (client: Client, interaction: Interaction, ...args: any) => Promise<void>
}

declare module 'discord.js' {
	export interface Client {
	  	commands: Collection<string, Command>
		locale: LocaleStrings
	}
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildPresences] })

export async function startClient() {
	if (!config.token) {
		PrettyLog.error('Missing token in config.json')
		process.exit(1)
	}

	await registerCommands(client)
	await registerEvents(client)

	await client.login(config.token)
}

startClient()


async function registerCommands(client: Client) {
	client.commands = new Collection()
	const commandsPath = path.join(__dirname, 'commands')
	const commandFiles = (await fs.readdir(commandsPath)).filter((file) => file.endsWith('.js'))

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file)
		const command: Command = await import(pathToFileURL(filePath).href)

		client.commands.set(command.data.name, command)
	}

	PrettyLog.logLoadStep('Commands registered')
}

async function registerEvents(client: Client<boolean>) {
	const eventsPath = path.join(__dirname, 'events')
	const eventFiles = (await fs.readdir(eventsPath)).filter((file) => file.endsWith('.js'))

	for (const file of eventFiles) {
		const filePath = path.join(eventsPath, file)
		const event = await import(pathToFileURL(filePath).href)
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args))
		} else {
			client.on(event.name, (...args) => event.execute(...args))
		}
	}

	PrettyLog.logLoadStep('Events registered')
}

process.on('unhandledRejection', (reason: unknown) => PrettyLog.error(`${reason}`, false))
process.on('uncaughtException', (reason: unknown) => PrettyLog.error(`${reason}`, false))
process.on('uncaughtExceptionMonitor', (reason: unknown) => PrettyLog.error(`${reason}`, false))