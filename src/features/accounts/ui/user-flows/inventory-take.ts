import { logToDiscord } from "@/app/services/logging.js"
import { HYDRATOR } from "@/core/database/init-databases.js"
import { t } from "@/core/i18n/i18n.js"
import { getOrCreateAccount } from "@/core/services/accounts/accounts.services.js"
import { NanoId } from "@/database/database.types.js"
import { Item } from "@/features/items/database/items.types.js"
import { updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js"
import { ok } from "@/lib/error-handling.js"
import { Identifiable } from "@/lib/types/core.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { ComponentSeparator, createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { showConfirmationModal } from "@/lib/ui/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { snowflakeSchema } from "@/schemas/utils.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, bold, roleMention, userMention } from "discord.js"
import z from "zod"
import { emptyAccount, setAccountItemAmount, takeItemFromAccounts } from "../../services/accounts.services.js"
import { getItems } from "@/core/services/items/items.services.js"



export const inventoryTakeParamsSchema = z.object({
    amount: z.number(),
    target: snowflakeSchema,
})

export class InventoryTakeFlow extends UserFlow<z.infer<typeof inventoryTakeParamsSchema>> {
    public override get id(): string { 
        return "account-take" 
    }

    private selectedItem: Item & Identifiable<NanoId> | null = null

    protected override async prestart(_interaction: ChatInputCommandInteraction) {
        await this.populateItemSelectMenu()
        return ok(true)
    }

    protected override getMessage() {
        return t(
            `userFlows.inventoryTake.messages.default`, 
            { 
                amount: bold(`${this.params.amount}`), 
                item: bold(`[${formattedEmojiableName(this.selectedItem) || t("defaultComponents.selectItem")}]`), 
                user: userMention(this.params.target) 
            }
        )
    }

    protected override initComponents() {
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
                if (!this.selectedItem) return this.updateInteraction(interaction)

                const [error, account] = await getOrCreateAccount(this.params.target)
                if (error) return updateAsErrorMessage(interaction, error.message)

                this.params.amount = account.inventory[this.selectedItem.id] || 0
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
                const [modalSubmitInteraction, confirmed] = await showConfirmationModal(
                    interaction,
                    t(`userFlows.inventoryTake.components.confirmationModalTitle`, { user: userMention(this.params.target) })
                )

                if (!confirmed) return this.updateInteraction(modalSubmitInteraction)

                const [error] = await emptyAccount(this.params.target, "inventory")
                if (error) return updateAsErrorMessage(modalSubmitInteraction, error.message)

                await updateAsSuccessMessage(modalSubmitInteraction, t(`userFlows.inventoryTake.messages.successfullyEmptied`, { user: userMention(this.params.target) }))
            }
        )

        return [
            createComponent(itemSelectMenu),
            createComponent(submitButton, () => submitButton.toggle(this.selectedItem != null)),
            createComponent(takeAllButton, () => takeAllButton.toggle(this.selectedItem != null)),
            createComponent(emptyInventoryButton),
        ]
    }

    private async populateItemSelectMenu() {
        const [error, account] = await getOrCreateAccount(this.params.target)
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

        if (!this.selectedItem) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const targetId = this.params.target

        const [error, account] = await getOrCreateAccount(targetId)
        if (error) return updateAsErrorMessage(interaction, error.message)

        const prevBalance = account.inventory[this.selectedItem.id] || 0
        const newBalance = Math.max(prevBalance - this.params.amount, 0)
        
        const [error2] = await setAccountItemAmount(targetId, this.selectedItem.id, newBalance)
        if (error2) return updateAsErrorMessage(interaction, error2.message)

        const takenAmount = Math.min(prevBalance, this.params.amount)

        const successMessage = t(
            `userFlows.inventoryTake.messages.success`, 
            { 
                amount: bold(`${takenAmount}`), 
                item: formattedEmojiableName(this.selectedItem), 
                user: userMention(targetId) 
            }
        )

        if (interaction.guild) {
            logToDiscord(interaction.guild, `${interaction.member} took **${takenAmount} ${formattedEmojiableName(this.selectedItem)}** from ${userMention(targetId)}`)
        }

        return await updateAsSuccessMessage(interaction, successMessage)

    }
}

export const bulkInventoryRemoveItemParamsSchema = z.object({
    role: snowflakeSchema
})

export class BulkInventoryRemoveItemFlow extends UserFlow<z.infer<typeof bulkInventoryRemoveItemParamsSchema>> {
    public override get id(): string { 
        return "bulk-inventory-remove-item" 
    }

    private selectedItem: Item & Identifiable<NanoId> | null = null

    protected override getMessage() {
        return t(
            `userFlows.inventoryTake.messages.bulkRemoveItem`, 
            {
                item: bold(`[${formattedEmojiableName(this.selectedItem) || t("defaultComponents.selectItem")}]`), 
                role: roleMention(this.params.role) 
            }
        )
    }

    protected override initComponents() {
        const itemSelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-item`, placeholder: t("defaultComponents.selectItem"), time: 120_000 },
            getItems(),
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

        return [
            createComponent(itemSelectMenu),
            createComponent(submitButton, () => submitButton.toggle(this.selectedItem != null))
        ]
    }

    protected override async success(interaction: UserInterfaceInteraction) {
        this.disableComponents()

        if (!this.selectedItem) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))

        const [error] = await takeItemFromAccounts(this.selectedItem.id)
        if (error) return updateAsErrorMessage(interaction, error.message)
        
        await updateAsSuccessMessage(interaction, t(
            `userFlows.inventoryTake.messages.bulkRemoveItemSuccess`, 
            {
                item: bold(`[${formattedEmojiableName(this.selectedItem)}]`), 
                role: roleMention(this.params.role) 
            }
        ))

        if (interaction.guild) {
            logToDiscord(interaction.guild, `${interaction.member} removed **${formattedEmojiableName(this.selectedItem)}** from the inventories of all members with role ${roleMention(this.params.role)}`)
        }
    }
}