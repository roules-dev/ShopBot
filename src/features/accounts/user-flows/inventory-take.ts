import { HYDRATOR } from "@/core/database/init-databases.js"
import { t } from "@/core/i18n/i18n.js"
import { getOrCreateAccount } from "@/core/services/accounts/accounts.services.js"
import { NanoId } from "@/database/database.types.js"
import { Item } from "@/features/items/database/items.types.js"
import { logToDiscord, replyErrorMessage, updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord.js"
import { Identifiable } from "@/lib/types/core.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { ComponentSeparator, createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { showConfirmationModal } from "@/lib/ui/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { SnowflakeSchema } from "@/schemas/utils.js"
import { ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, MessageFlags, User, bold, userMention } from "discord.js"
import { emptyAccount, setAccountItemAmount } from "../services/accounts.services.js"


// TODO: implement inventory take / bulk take
//? user suggestion #14


export class InventoryTakeFlow extends UserFlow {
    public override get id(): string { 
        return "account-take" 
    }

    private selectedItem: Item & Identifiable<NanoId> | null = null
    
    private target: User | null = null
    private amount: number | null = null

    

    public async start(interaction: ChatInputCommandInteraction) {
        const target = interaction.options.getUser("target")
        const amount = interaction.options.getNumber("amount")
    
        if (!target || !amount) return replyErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        this.target = target
        this.amount = amount

        await this.populateItemSelectMenu()
        this.updateComponents()

        const response = await interaction.reply({ content: this.getMessage(), components: this.getComponentRows(), flags: MessageFlags.Ephemeral, withResponse: true })
        this.createComponentsCollectors(response)
        return
    }

    protected override getMessage() {
        return t(
            `userFlows.inventoryTake.messages.default`, 
            { 
                amount: bold(`${this.amount}`), 
                item: bold(`[${this.selectedItem?.name || t("defaultComponents.selectItem")}]`), 
                user: userMention(this.target!.id) 
            }
        )
    }

    protected override initComponents() {
        const targetId = SnowflakeSchema.parse(this.target?.id)

        const itemSelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-item`, placeholder: t("defaultComponents.selectItem"), time: 120_000 },
            new Map<NanoId, Item>(),
            (interaction) => this.updateInteraction(interaction),
            (interaction, selectedItem) => {
                this.selectedItem = selectedItem
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+submit`,
                label: t(`userFlows.inventoryTake.components.submitButton`),
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
                label: t(`userFlows.inventoryTake.components.takeAllButton`),
                emoji: "🔥",
                style: ButtonStyle.Danger,
                disabled: true,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                if (!this.selectedItem || !this.target) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

                const [error, account] = await getOrCreateAccount(targetId)
                if (error) return updateAsErrorMessage(interaction, error.message)

                this.amount = account.inventory[this.selectedItem.id] || 0
                this.success(interaction)
            }
        )

        const emptyInventoryButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+empty-inventory`,
                label: t(`userFlows.inventoryTake.components.emptyInventoryButton`),
                emoji: "🗑️",
                style: ButtonStyle.Danger,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmitInteraction, confirmed] = await showConfirmationModal(interaction)

                if (!confirmed) return this.updateInteraction(modalSubmitInteraction)

                if (!this.target) return updateAsErrorMessage(modalSubmitInteraction, t("errorMessages.insufficientParameters"))

                const [error] = await emptyAccount(targetId, "currencies")
                if (error) return updateAsErrorMessage(modalSubmitInteraction, error.message)

                await updateAsSuccessMessage(modalSubmitInteraction, t(`userFlows.inventoryTake.messages.successfullyEmptied`, { user: userMention(this.target!.id) }))
            }
        )

        return [
            createComponent(itemSelectMenu),
            createComponent(submitButton, () => submitButton.toggle(this.selectedItem != null)),
            createComponent(takeAllButton, () => takeAllButton.toggle(this.selectedItem != null && this.target != null)),
            createComponent(emptyInventoryButton),
        ]
    }

    private async populateItemSelectMenu() {
        if (!this.target) throw new Error("Unexpected error: target is null") // TODO once userflows are refactored this will no longer be needed

        const targetId = SnowflakeSchema.parse(this.target.id)

        const [error, account] = await getOrCreateAccount(targetId)
        if (error) throw error

        const [error2, inventory] = HYDRATOR.getHydratedAccountInventory(account)
        if (error2) throw error2

        const inventoryMap = new Map<NanoId, Item>()
        for (const [itemId, itemBalance] of inventory) {
            inventoryMap.set(itemId, itemBalance.resource)
        }

        const itemSelectMenu = this.components.get(`${this.id}+select-item`)
        if (!itemSelectMenu) throw new Error("Unexpected error: itemSelectMenu is null")
        if (itemSelectMenu instanceof ComponentSeparator || !(itemSelectMenu.comp instanceof ExtendedStringSelectMenuComponent)) throw new Error("Unexpected error: itemSelectMenu is not ExtendedStringSelectMenuComponent")
        
        itemSelectMenu.comp.updateMap(inventoryMap)

    }

    protected async success(interaction: ButtonInteraction) {
        this.disableComponents()

        if (!this.selectedItem || !this.target || !this.amount) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const targetId = SnowflakeSchema.parse(this.target.id)

        const [error, account] = await getOrCreateAccount(targetId)
        if (error) return updateAsErrorMessage(interaction, error.message)

        const currentBalance = account.inventory[this.selectedItem.id] || 0
        const newBalance = Math.max(currentBalance - this.amount, 0)
        
        const [error2] = await setAccountItemAmount(targetId, this.selectedItem.id, newBalance)
        if (error2) return updateAsErrorMessage(interaction, error2.message)

        const successMessage = t(
            `userFlows.inventoryTake.messages.success`, 
            { 
                amount: bold(`${this.amount}`), 
                item: this.selectedItem.name, 
                user: userMention(targetId) 
            }
        )

        if (interaction.guild) {
            logToDiscord(interaction.guild, `${interaction.member} took **${this.amount} ${this.selectedItem.name}** from ${userMention(targetId)}`)
        }

        return await updateAsSuccessMessage(interaction, successMessage)

    }
}