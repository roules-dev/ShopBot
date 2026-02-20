import { replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { getLocale, errorMessages, replaceTemplates, defaultComponents } from "@/lib/localisation.js"
import { UserFlow } from "@/user-flows/user-flow.js"
import { ExtendedComponent, ExtendedStringSelectMenuComponent, ExtendedButtonComponent } from "@/user-interfaces/extended-components.js"
import { ChatInputCommandInteraction, MessageFlags, StringSelectMenuInteraction, ButtonStyle, ButtonInteraction, bold } from "discord.js"
import { getShops, getShopName, removeShop } from "../database/shops-database.js"
import { Shop } from "../database/shops-types.js"

export class ShopRemoveFlow extends UserFlow {
    public id = 'shop-remove'
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedShop: Shop | null = null

    protected locale = getLocale().userFlows.shopRemove

    public override async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const shops = getShops()
        if (!shops.size) return replyErrorMessage(interaction, errorMessages().noShops)

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return replaceTemplates(this.locale.messages.default, { shop: getShopName(this.selectedShop?.id) || defaultComponents().selectShop })
    }

    protected override initComponents(): void {
        const shopSelectMenu = new ExtendedStringSelectMenuComponent<Shop>(
            {
                customId: `${this.id}+select-shop`,
                placeholder: defaultComponents().selectShop,
                time: 120_000
            }, 
            getShops(), 
            (interaction) => this.updateInteraction(interaction),
                (interaction: StringSelectMenuInteraction, selected: Shop): void => {
                this.selectedShop = selected
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent({
            customId: `${this.id}+submit`,
            time: 120_000,
            label: this.locale.components.submitButton,
            emoji: {name: '⛔'},
            style: ButtonStyle.Danger,
            disabled: true
        }, (interaction: ButtonInteraction) => this.success(interaction))

        this.components.set(shopSelectMenu.customId, shopSelectMenu)
        this.components.set(submitButton.customId, submitButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (!(submitButton instanceof ExtendedButtonComponent)) return

        submitButton.toggle(this.selectedShop != null)
    }


    protected override async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()

        if (!this.selectedShop) return updateAsErrorMessage(interaction, errorMessages().insufficientParameters)
        
        const [error] = await removeShop(this.selectedShop.id)

        if (error) return await updateAsErrorMessage(interaction, error.message)

        return await updateAsSuccessMessage(interaction, replaceTemplates(this.locale.messages.success, { shop: bold(getShopName(this.selectedShop.id)!) }))

    }
}