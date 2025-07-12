import fs from 'fs/promises'
import path from 'node:path'

import express, { Request, Response, Router, Express } from "express";
import cors from 'cors'

import { Client, Collection, GatewayIntentBits, Interaction, SlashCommandBuilder } from 'discord.js'

import config from '../config/config.json'
import { PrettyLog } from './utils/pretty-log'
import './utils/strings'

const extension = __filename.split('.').pop()

interface Command {
	data: SlashCommandBuilder,
	execute: (client: Client, interaction: Interaction, ...args: any) => Promise<void>
}

declare module 'discord.js' {
	export interface Client {
	  	commands: Collection<string, Command>
	}
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] })


registerCommands(client)
registerEvents(client)


if (config.apiEnabled) {
	const app = express();
	const PORT = config.port || 3000;

	app.use(cors());
	app.use(express.json());


	app.listen(PORT, async () => {
		await registerRoutes(app)
		PrettyLog.logLoadStep(`Server is running on port`, `${PORT}`)
	})

		
	app.get('/', (req: Request, res: Response) => {
		res.send("API Running");
	})
}


client.login(config.token)



async function registerCommands(client: Client) {
	client.commands = new Collection()
	const commandsPath = path.join(__dirname, 'commands')
	const commandFiles = (await fs.readdir(commandsPath)).filter((file) => file.endsWith(`.${extension}`))

	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file)
		const command: Command = require(filePath)
		client.commands.set(command.data.name, command)
	}

	PrettyLog.logLoadStep('Commands registered')
}

async function registerEvents(client: Client<boolean>) {
	const eventsPath = path.join(__dirname, 'events')
	const eventFiles = (await fs.readdir(eventsPath)).filter((file) => file.endsWith(`.${extension}`))

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

async function registerRoutes(app: Express) {
    const extension = __filename.split('.').pop()

    const routesPath = path.join(__dirname, 'api/routes')
	const routeFiles = (await fs.readdir(routesPath)).filter((file) => file.endsWith(`.${extension}`))

	for (const file of routeFiles) {
		const filePath = path.join(routesPath, file)
		const route: Router = require(filePath).default

        app.use("/api", route)
	}

	PrettyLog.logLoadStep('Routes registered')
}




process.on('unhandledRejection', (reason: unknown) => PrettyLog.error(`${reason}`, false))
process.on('uncaughtException', (reason: unknown) => PrettyLog.error(`${reason}`, false))
process.on('uncaughtExceptionMonitor', (reason: unknown) => PrettyLog.error(`${reason}`, false))