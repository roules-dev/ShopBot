import { ShopUserInterface } from '@/features/shops/user-interfaces/shop-ui.js'
import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from 'discord.js'


export const data = new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Display shops and buy products')


export async function execute(_client: Client, interaction: ChatInputCommandInteraction) {
    const shopInterface = new ShopUserInterface()
    shopInterface.display(interaction)
}
