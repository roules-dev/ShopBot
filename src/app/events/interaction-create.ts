import { processTrade } from "@/features/trade/services/process-trade.js"
import { replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { PrettyLog } from "@/lib/pretty-log.js"
import { nanoIdSchema } from "@/schemas/utils.js"
import { BaseInteraction, ButtonInteraction, ChannelType, ChatInputCommandInteraction, Events } from "discord.js"
import z from "zod"


export const name = Events.InteractionCreate

export async function execute(interaction: BaseInteraction) {
    if (interaction.user.bot) return
    
    if (interaction.isChatInputCommand()) {
        handleSlashCommand(interaction)
        return
    }
    
    if (interaction.isButton()) {
        handleButton(interaction)
        return
    }
}


async function handleSlashCommand(interaction: ChatInputCommandInteraction) {
    const command = interaction.client.commands.get(interaction.commandName)
    if (!command) return
    if (interaction?.channel?.type === ChannelType.DM) return
    try {
        PrettyLog.info(`${interaction.user.username} (${interaction.user.id}) in #${interaction?.channel?.name} (${interaction?.channel?.id}) triggered the command "/${interaction.commandName}"`)
        await command.execute(interaction.client, interaction)
    } catch (error: unknown) {
        console.error(error)
        PrettyLog.error(
            `Failed to execute the command "/${interaction.commandName}" (user: ${interaction.user.username} (${interaction.user.id}) in #${interaction?.channel?.name} (${interaction?.channel?.id}))`,
            true,
            (error instanceof Error ? error : undefined)
        )
        
        await replyErrorMessage(interaction)
    }
}


async function handleButton(interaction: ButtonInteraction) {
    if (interaction.customId.startsWith("trade")) {
        const tradeInfo = interaction.customId.substring("trade-".length)
        const [_status, _id] = tradeInfo.split(":")
        
        try {
            const status = z.enum(["accept", "deny"]).parse(_status)
            const id = nanoIdSchema.parse(_id)
            
            processTrade(interaction, id, status)
        }
        catch (error) {
            await replyErrorMessage(interaction)
        }

        return
    }
}