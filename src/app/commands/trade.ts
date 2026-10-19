import { TradeUserInterface } from "@/features/trade/ui/user-interfaces/trade-ui.js"
import { ChatInputCommandInteraction, Client, SlashCommandBuilder } from "discord.js"

export const data = new SlashCommandBuilder()
    .setName("trade")
    .setDescription("Trade items and currencies with other users")
    .addUserOption(option => option
        .setName("user")
        .setDescription("The user you want to trade with")
        .setRequired(true)
    )

export async function execute(_client: Client, interaction: ChatInputCommandInteraction){
    const tradePartner = interaction.options.getUser("user", true)
    const tradePartnerMember = await interaction.guild?.members.fetch(tradePartner.id)

    if (!tradePartnerMember) {
        await interaction.reply({ content: "The specified user is not a member of this server.", ephemeral: true })
        return
    }

    const tradeUI = new TradeUserInterface({ tradePartnerMember })
    tradeUI.display(interaction)

}