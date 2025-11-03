import { SlashCommandBuilder, Client, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js"
import { DisplayPermanentShopFlow } from "../user-flows/shops-flows"

export const data = new SlashCommandBuilder()
    .setName('display-shop')
    .setDescription('Permanently displays a shop in the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)


export async function execute(_client: Client, interaction: ChatInputCommandInteraction){
    const displayShopFlow = new DisplayPermanentShopFlow()
    displayShopFlow.start(interaction)
}