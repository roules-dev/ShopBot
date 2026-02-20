import { PrettyLog } from '#root/src/lib/pretty-log.js'
import { getSetting } from '@/features/settings/database/settings-handler.js'
import { ActivityType, Client, Events } from 'discord.js'


export const name = Events.ClientReady
export const once = true

export async function execute(client: Client) {
	if (!client.user) return
	const activity = getActivity()
	if (activity !== undefined) {
		client.user.setActivity(activity)
	}

	PrettyLog.logLoadStep(`Bot connected with username:`, `${client.user.username}`)
	PrettyLog.logLoadSuccess()

}

function getActivity() {
	const activityMessage = getSetting('activityMessage')?.value
	if (typeof activityMessage !== 'string') return undefined

	const activityTypeName = getSetting('activityType')?.value

	const activityType = activityTypeName == "Playing" ? ActivityType.Playing :
						 activityTypeName == "Streaming" ? ActivityType.Streaming :
						 activityTypeName == "Listening" ? ActivityType.Listening :
						 activityTypeName == "Watching" ? ActivityType.Watching :
						 activityTypeName == "Competing" ? ActivityType.Competing :
						 undefined

	return activityType ? { name: activityMessage, type: activityType } : undefined
}
