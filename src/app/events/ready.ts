import { PrettyLog } from "@/lib/pretty-log.js"
import { Events, Client } from "discord.js"
import { setActivity } from "../client/status.js"







export const name = Events.ClientReady
export const once = true

export async function execute(client: Client) {
	if (!client.user) return

	setActivity(client)

	PrettyLog.logLoadStep(`Bot connected with username:`, `${client.user.username}`)
	PrettyLog.logLoadSuccess()

}

