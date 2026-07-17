import { getTypedSettingValue } from "@/features/settings/database/settings.database.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { Guild, TextChannel } from "discord.js"

export async function logToDiscord(guild: Guild, message: string) {
    try {
        const [error, logChannelId] = getTypedSettingValue("logChannelId", "channelId")
        if (error) throw error
        if (!logChannelId) return
        
        const logChannel = await guild.channels.fetch(logChannelId)
        if (!(logChannel instanceof TextChannel)) return

        await logChannel.send(message)

        const simplifiedMessage = message.replaceAll("**", "\"")

        PrettyLog.info(`Logged to Discord: ${simplifiedMessage}`)

    } catch (error) {
        PrettyLog.error(`Failed to log to Discord: ${error}`)
    }
}
