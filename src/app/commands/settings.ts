import { SettingsInterface } from "@/features/settings/user-interfaces/settings-ui.js"
import { ChatInputCommandInteraction, Client, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"


export const data = new SlashCommandBuilder()
    .setName('settings')
    .setDescription('See and edit your settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)


export async function execute(_client: Client, interaction: ChatInputCommandInteraction){
    const settingsInterface = new SettingsInterface()
    await settingsInterface.display(interaction)
}
