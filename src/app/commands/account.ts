import { AccountUserInterface } from "@/features/accounts/user-interfaces/account-ui.js"
import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from "discord.js"


export const data = new SlashCommandBuilder()
    .setName('account')
    .setDescription('Display your account')

    //? (user suggestion - issue #13) add option to display a "snapshot" of the account publicly


export async function execute(_client: Client, interaction: ChatInputCommandInteraction){
    const accountUI = new AccountUserInterface(interaction.user)
    accountUI.display(interaction)
}
