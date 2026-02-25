import { getSettings } from "@/features/settings/database/settings-handler.js"
import { t } from "@/lib/localization.js"
import { UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js"
import { Guild, MessageFlags, TextChannel } from "discord.js"
import { PrettyLog } from "./pretty-log.js"






export async function replyErrorMessage(interaction: UserInterfaceInteraction, errorMessage?: string) {
    return await interaction.reply({ content: getErrorMessage(errorMessage), flags: MessageFlags.Ephemeral })
}

export async function updateAsErrorMessage(interaction: UserInterfaceInteraction, errorMessage?: string) {
    const message = getErrorMessage(errorMessage)
    await updateWithMessage(interaction, message)
}

export async function replySuccessMessage(interaction: UserInterfaceInteraction, successMessage: string) {
    return await interaction.reply({ content: getSuccessMessage(successMessage), flags: MessageFlags.Ephemeral })
}

export async function updateAsSuccessMessage(interaction: UserInterfaceInteraction, successMessage: string) {
    const message = getSuccessMessage(successMessage)
    await updateWithMessage(interaction, message)
}

async function updateWithMessage(interaction: UserInterfaceInteraction, message: string) {
    if (interaction.deferred) return await interaction.editReply({ content: message, components: [] })
    if (interaction.isMessageComponent() || (interaction.isModalSubmit() && interaction.isFromMessage())) return await interaction.update({ content: message, components: [] })
    return await interaction.editReply({ content: message, components: [] })
}

function getErrorMessage(errorMessage?: string) {
    return `❌ ${errorMessage ? errorMessage : t("errorMessages.default")}`
}

function getSuccessMessage(successMessage: string) {
    return `✅ ${successMessage}`
}

export async function logToDiscord(guild: Guild, message: string) {

    try {
        const logChannelSetting = getSettings().get('logChannelId')
        if (!logChannelSetting?.value || logChannelSetting.type !== 'channelId') return
        const logChannel = await guild.channels.fetch(logChannelSetting.value)
        if (!(logChannel instanceof TextChannel)) return

        await logChannel.send(message)

        const simplifiedMessage = message.replaceAll("**", "\"")

        PrettyLog.info(`Logged to Discord: ${simplifiedMessage}`)

    } catch (error) {
        PrettyLog.error(`Failed to log to Discord: ${error}`)
    }
}
