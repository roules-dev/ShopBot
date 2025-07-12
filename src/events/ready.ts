import { Client } from 'discord.js'
import { PrettyLog } from '../utils/pretty-log'

export const name = 'ready'
export const once = true

export async function execute(client: Client) {
	if (!client.user) return

	PrettyLog.logLoadStep(`Bot connected with username:`, `${client.user.username}`)
	PrettyLog.logLoadSuccess()

}

