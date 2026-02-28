import { getSetting } from "@/features/settings/database/settings-handler.js"
import { ActivityOptions, ActivityType, Client } from "discord.js"




function getActivity() {
	const activityMessage = getSetting("activityMessage")?.value
	if (typeof activityMessage !== "string") return undefined

	const activityTypeName = getSetting("activityType")?.value

	const activityType = activityTypeName == "Playing" ? ActivityType.Playing :
						 activityTypeName == "Streaming" ? ActivityType.Streaming :
						 activityTypeName == "Listening" ? ActivityType.Listening :
						 activityTypeName == "Watching" ? ActivityType.Watching :
						 activityTypeName == "Competing" ? ActivityType.Competing :
						 undefined

	return activityType ? { name: activityMessage, type: activityType } : undefined
}


export function setActivity(client: Client, activity?: ActivityOptions) {
    if (!client.user) return

    if (activity === undefined) {
        activity = getActivity()
    }

    client.user.setActivity(activity)
}

