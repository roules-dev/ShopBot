import { ActivityType, Client } from 'discord.js'
import { PrettyLog } from '../utils/pretty-log'
import { getSetting } from '../database/settings/settings-handler'

export const name = 'clientReady'
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
