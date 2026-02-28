import { Product } from "@/features/shops/database/products-types.js";
import { logToDiscord, replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js";
import { t } from "@/lib/localization.js";
import { ExtendedButtonComponent } from "@/ui-components/button.js";
import { ExtendedComponent } from "@/ui-components/extended-components.js";
import { showConfirmationModal } from "@/ui-components/modals.js";
import { ExtendedStringSelectMenuComponent } from "@/ui-components/string-select-menu.js";
import { UserFlow } from "@/user-flows/user-flow.js";
import { ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, User, bold, userMention } from "discord.js";
import { emptyAccount, getOrCreateAccount, setAccountItemAmount } from "../database/accounts-database.js";


// TODO: implement inventory take / bulk take
//? user suggestion #14


export class InventoryTakeFlow extends UserFlow {
    public id = "account-take"
    protected components: Map<string, ExtendedComponent> = new Map()

    private selectedItem: Product | null = null
    
    private target: User | null = null
    private amount: number | null = null

    protected locale = "userFlows.inventoryTake" as const

    public async start(interaction: ChatInputCommandInteraction): Promise<unknown> {
        const target = interaction.options.getUser("target")
        const amount = interaction.options.getNumber("amount")
    
        if (!target || !amount) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        this.target = target
        this.amount = amount

        this.initComponents()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage(): string {
        return t(
            `${this.locale}.messages.default`, 
            { 
                amount: bold(`${this.amount}`), 
                item: bold(`[${this.selectedItem?.name || t("defaultComponents.selectItem")}]`), 
                user: userMention(this.target!.id) 
            }
        )
    }

    protected override async initComponents() {
        if (!this.target) throw new Error("Unexpected error: target is null")
        const [error, account] = await getOrCreateAccount(this.target.id)

        if (error) throw error

        const inventory = account.inventory

        const inventoryMap = new Map<string, Product & { amount: number }>()
        for (const [itemId, itemBalance] of inventory) {
            inventoryMap.set(itemId, { ...itemBalance.item, amount: itemBalance.amount }  )
        }

        const itemSelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-item`, placeholder: t("defaultComponents.selectItem"), time: 120_000 },
            inventoryMap,
            (interaction) => this.updateInteraction(interaction),
            (interaction, selectedItem): void => {
                this.selectedItem = selectedItem
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: t(`${this.locale}.components.submitButton`),
                emoji: "✅",
                style: ButtonStyle.Success,
                disabled: true,
                time: 120_000,
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )

        const takeAllButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+take-all`,
                label: t(`${this.locale}.components.takeAllButton`),
                emoji: "🔥",
                style: ButtonStyle.Danger,
                disabled: true,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                if (!this.selectedItem || !this.target) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

                const [error, account] = await getOrCreateAccount(this.target.id)
                if (error) return updateAsErrorMessage(interaction, error.message)

                this.amount = account.currencies.get(this.selectedItem.id)?.amount || 0
                this.success(interaction)
            }
        )

        const emptyInventoryButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+empty-inventory`,
                label: t(`${this.locale}.components.emptyInventoryButton`),
                emoji: "🗑️",
                style: ButtonStyle.Danger,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmitInteraction, confirmed] = await showConfirmationModal(interaction)

                if (!confirmed) return this.updateInteraction(modalSubmitInteraction)

                if (!this.target) return updateAsErrorMessage(modalSubmitInteraction, t("errorMessages.insufficientParameters"))

                const [error] = await emptyAccount(this.target.id, "currencies")
                if (error) return updateAsErrorMessage(modalSubmitInteraction, error.message)

                await updateAsSuccessMessage(modalSubmitInteraction, t(`${this.locale}.messages.successfullyEmptied`, { user: userMention(this.target!.id) }))
            }
        )

        this.components.set(itemSelectMenu.customId, itemSelectMenu)
        this.components.set(submitButton.customId, submitButton)
        this.components.set(takeAllButton.customId, takeAllButton)
        this.components.set(emptyInventoryButton.customId, emptyInventoryButton)
    }

    protected override updateComponents(): void {
        const submitButton = this.components.get(`${this.id}+submit`)
        if (submitButton instanceof ExtendedButtonComponent) {
            submitButton.toggle(this.selectedItem != null)
        }

        const takeAllButton = this.components.get(`${this.id}+take-all`)
        if (takeAllButton instanceof ExtendedButtonComponent) {
            takeAllButton.toggle(this.selectedItem != null && this.target != null)
        }
    }

    protected async success(interaction: ButtonInteraction): Promise<unknown> {
        this.disableComponents()

        if (!this.selectedItem || !this.target || !this.amount) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const [error, account] = await getOrCreateAccount(this.target.id)
        if (error) return updateAsErrorMessage(interaction, error.message)

        const currentBalance = account.currencies.get(this.selectedItem.id)?.amount || 0
        const newBalance = Math.max(currentBalance - this.amount, 0)
        
        const [error2] = await setAccountItemAmount(this.target.id, this.selectedItem, newBalance)
        if (error2) return updateAsErrorMessage(interaction, error2.message)

        const successMessage = t(
            `${this.locale}.messages.success`, 
            { 
                amount: bold(`${this.amount}`), 
                item: this.selectedItem.name, 
                user: userMention(this.target.id) 
            }
        )

        if (interaction.guild) {
            logToDiscord(interaction.guild, `${interaction.member} took **${this.amount} ${this.selectedItem.name}** from ${userMention(this.target.id)}`)
        }

        return await updateAsSuccessMessage(interaction, successMessage)

    }
}