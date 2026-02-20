import { PrettyLog } from "@//lib/pretty-log.js"
import { getSettings } from "@/features/settings/database/settings-handler.js"
import { errorMessages } from "@/lib/localisation.js"
import { UserInterfaceInteraction } from "@/user-interfaces/user-interfaces.js"
import { MessageFlags, TextChannel } from "discord.js"

export async function replyErrorMessage(interaction: UserInterfaceInteraction, errorMessage?: string) {
    return await interaction.reply({ content: getErrorMessage(errorMessage), flags: MessageFlags.Ephemeral })
}

export async function updateAsErrorMessage(interaction: UserInterfaceInteraction, errorMessage?: string) {
    const message = getErrorMessage(errorMessage)

    if (interaction.deferred) return await interaction.editReply({ content: message, components: [] })
    if (interaction.isMessageComponent() || (interaction.isModalSubmit() && interaction.isFromMessage())) return await interaction.update({ content: message, components: [] })
    return await interaction.editReply({ content: message, components: [] })
}

export async function replySuccessMessage(interaction: UserInterfaceInteraction, successMessage: string) {
    return await interaction.reply({ content: getSuccessMessage(successMessage), flags: MessageFlags.Ephemeral })
}

export async function updateAsSuccessMessage(interaction: UserInterfaceInteraction, successMessage: string) {
    const message = getSuccessMessage(successMessage)

    if (interaction.deferred) return await interaction.editReply({ content: message, components: [] })
    if (interaction.isMessageComponent() || (interaction.isModalSubmit() && interaction.isFromMessage())) return await interaction.update({ content: message, components: [] })
    return await interaction.editReply({ content: message, components: [] })
}



function getErrorMessage(errorMessage?: string) {
    return `❌ ${errorMessage ? errorMessage : errorMessages().default}`
}

function getSuccessMessage(successMessage: string) {
    return `✅ ${successMessage}`
}

export async function logToDiscord(interaction: UserInterfaceInteraction, message: string) {
    PrettyLog.info(`Logged to Discord: ${message}`)
    
    try {
        const logChannelSetting = getSettings().get('logChannelId')
        if (!logChannelSetting?.value || logChannelSetting.type !== 'channelId') return
        const logChannel = await interaction.guild?.channels.fetch(logChannelSetting.value)
        if (!(logChannel instanceof TextChannel)) return

        await logChannel.send(message)
    } catch (error) {
        PrettyLog.error(`Failed to log to Discord: ${error}`)
    }
}
