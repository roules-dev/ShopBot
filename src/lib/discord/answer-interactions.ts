import { t } from "@/core/i18n/i18n.js"
import { MessageFlags } from "discord.js"
import { UserInterfaceInteraction } from "../ui/types/ui.js"



export async function replyErrorMessage(interaction: UserInterfaceInteraction, errorMessage?: string) {
    return await replyWithMessage(interaction, getErrorMessage(errorMessage))
}

export async function updateAsErrorMessage(interaction: UserInterfaceInteraction, errorMessage?: string) {
    const message = getErrorMessage(errorMessage)
    await updateWithMessage(interaction, message)
}

export async function replySuccessMessage(interaction: UserInterfaceInteraction, successMessage: string) {
    return await replyWithMessage(interaction, getSuccessMessage(successMessage))
}

export async function updateAsSuccessMessage(interaction: UserInterfaceInteraction, successMessage: string) {
    const message = getSuccessMessage(successMessage)
    await updateWithMessage(interaction, message)
}

export async function replyWithMessage(interaction: UserInterfaceInteraction, message: string) {
    if (interaction.replied) return await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral })
    return await interaction.reply({ content: message, flags: MessageFlags.Ephemeral })
}

async function updateWithMessage(interaction: UserInterfaceInteraction, message: string) {
    if (interaction.deferred) return await interaction.editReply({ content: message, components: [] })
    if (interaction.isMessageComponent() || (interaction.isModalSubmit() && interaction.isFromMessage())) return await interaction.update({ content: message, components: [] })
    return await interaction.editReply({ content: message, components: [] })
}

function getErrorMessage(errorMessage?: string) {
    return errorFormat(errorMessage ? errorMessage : t("errorMessages.default"))
}
export function errorFormat(message: string) {
    return `❌ ${message}`
}

function getSuccessMessage(successMessage: string) {
    return successFormat(successMessage)
}

export function successFormat(message: string) {
    return `✅ ${message}`
}

