import fs from 'fs/promises'
import path from 'node:path'

import { Client, Collection, GatewayIntentBits, Interaction, SlashCommandBuilder } from 'discord.js'
import config from '../config/config.json'
import { PrettyLog } from './utils/pretty-log'
import './utils/strings'
import { addLocalisationToCommand, getLocales, LocaleStrings } from './utils/localisation'
import { getSetting } from './database/settings/settings-handler'


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
		const command: Command = require(filePath)

		client.commands.set(command.data.name, command)
	}

	PrettyLog.logLoadStep('Commands registered')
}

async function registerEvents(client: Client<boolean>) {
	const eventsPath = path.join(__dirname, 'events')
	const eventFiles = (await fs.readdir(eventsPath)).filter((file) => file.endsWith('.js'))

	for (const file of eventFiles) {
		const filePath = path.join(eventsPath, file)
		const event = require(filePath)
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args))
		} else {
			client.on(event.name, (...args) => event.execute(...args))
		}
	}

	PrettyLog.logLoadStep('Events registered')
}

async function setLanguageToClient() {
	const locales = await getLocales()

	const languageSetting = getSetting('language')

	client.locale = locales[languageSetting?.value as string] ?? locales['en-US']
}

export function getLocale(): LocaleStrings {
	return client.locale
}


process.on('unhandledRejection', (reason: unknown) => PrettyLog.error(`${reason}`, false))
process.on('uncaughtException', (reason: unknown) => PrettyLog.error(`${reason}`, false))
process.on('uncaughtExceptionMonitor', (reason: unknown) => PrettyLog.error(`${reason}`, false))