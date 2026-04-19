import { t } from "@/core/i18n/i18n.js"
import { MessageFlags } from "discord.js"
import { UserInterfaceInteraction } from "../ui/types/ui.js"


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

