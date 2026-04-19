import { t } from "@/core/i18n/i18n.js"
import { getShops, removeShop } from "@/core/services/shops/shops.services.js"
import { NanoId } from "@/database/database.types.js"
import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { Identifiable } from "@/lib/types/core.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, bold } from "discord.js"
import { Shop } from "../database/shops.types.js"


export class ShopRemoveFlow extends UserFlow {
    public override get id(): string { 
        return "shop-remove" 
    }

    private selectedShop: Shop & Identifiable<NanoId> | null = null

    

    public override async start(interaction: ChatInputCommandInteraction) {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, t("errorMessages.noShops"))

        
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage() {
        return t(`userFlows.shopRemove.messages.default`, { shop: this.selectedShop?.name || t("defaultComponents.selectShop")})
    }

    protected override initComponents() {

        const shopSelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${this.id}+select-shop`,
                placeholder: t("defaultComponents.selectShop"),
                time: 120_000
            }, 
            getShops(), 
            (interaction) => this.updateInteraction(interaction),
                (interaction, selected) => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent({
            customId: `${this.id}+submit`,
            time: 120_000,
            label: t(`userFlows.shopRemove.components.submitButton`),
            emoji: {name: "⛔"},
            style: ButtonStyle.Danger,
            disabled: true
        }, (interaction: ButtonInteraction) => this.success(interaction))

        return [
            createComponent(shopSelectMenu),
            createComponent(submitButton, () => submitButton.toggle(this.selectedShop != null)),
        ]
    }



    protected override async success(interaction: ButtonInteraction) {
        this.disableComponents()

        if (!this.selectedShop) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const [error] = await removeShop(this.selectedShop.id)

        if (error) return await updateAsErrorMessage(interaction, error.message)

        return await updateAsSuccessMessage(interaction, t(`userFlows.shopRemove.messages.success`, { shop: bold(this.selectedShop.name) }))

    }
}