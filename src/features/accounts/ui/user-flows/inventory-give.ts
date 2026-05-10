import { logToDiscord } from "@/app/services/logging.js";
import { t } from "@/core/i18n/i18n.js";
import { getOrCreateAccount } from "@/core/services/accounts/accounts.services.js";
import { getItems } from "@/core/services/items/items.services.js";
import { NanoId } from "@/database/database.types.js";
import { Item } from "@/features/items/database/items.types.js";
import { updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js";
import { err, ok } from "@/lib/error-handling.js";
import { Identifiable } from "@/lib/types/core.js";
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js";
import { createComponent } from "@/lib/ui/ui-components/extended-components.js";
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js";
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js";
import { validate } from "@/lib/validation/validation.js";
import { snowflakeSchema } from "@/schemas/utils.js";
import { formattedEmojiableName } from "@/utils/formatting.js";
import { ButtonInteraction, ButtonStyle, bold, roleMention, userMention } from "discord.js";
import z from "zod";
import { setAccountItemAmount } from "../../services/accounts.services.js";


abstract class BaseItemGiveFlow<T extends Record<string, unknown>> extends UserFlow<T> {
    protected selectedItem: Item & Identifiable<NanoId> | null = null;

    protected override async prepare() {
        const items = getItems()
        if (!items.size) 
            return err(`${t(`userFlows.inventoryGive.errorMessages.cantGiveItem`)} ${t("errorMessages.noItems")}`);
        return ok(true);
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
                label: t(`userFlows.inventoryGive.components.submitButton`), 
                emoji: "✅", 
                style: ButtonStyle.Success, 
                disabled: true,
                time: 120_000, 
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )
    
        return [
            createComponent(itemSelectMenu),
            createComponent(submitButton, () => submitButton.toggle(this.selectedItem != null)),
        ]
    }
}


export const inventoryGiveParamsSchema = z.object({
    amount: z.number(),
    target: snowflakeSchema,
})

export class InventoryGiveFlow extends BaseItemGiveFlow<z.infer<typeof inventoryGiveParamsSchema>> {
    public get id() { return "inventory-give" }

    protected override getMessage() {
        return t(
            `userFlows.inventoryGive.messages.default`, 
            { 
                amount: bold(`${this.params.amount}`), 
                item: bold(`[${formattedEmojiableName(this.selectedItem) || t("defaultComponents.selectItem")}]`), 
                user: userMention(this.params.target) 
            }
        )
    }

    protected async success(interaction: ButtonInteraction) {
        this.disableComponents()
        
        if (!this.selectedItem) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const targetId = this.params.target

        const [error, account] = await getOrCreateAccount(targetId)
        if (error) return updateAsErrorMessage(interaction, error.message)

        const currentBalance = account.inventory[this.selectedItem.id] || 0
        const [error2, _] = await setAccountItemAmount(targetId, this.selectedItem.id, currentBalance + this.params.amount)

        if (error2) return updateAsErrorMessage(interaction, error2.message)
        
        const successMessage = t(
            `userFlows.inventoryGive.messages.success`, 
            { 
                amount: bold(`${this.params.amount}`), 
                item: formattedEmojiableName(this.selectedItem), 
                user: userMention(targetId) 
            }
        )

        if (interaction.guild) {
            logToDiscord(interaction.guild, `${interaction.member} gave **${this.params.amount} ${formattedEmojiableName(this.selectedItem)}** to ${userMention(targetId)}`)
        }

        return await updateAsSuccessMessage(interaction, successMessage)
    }
}

export const bulkInventoryGiveParamsSchema = z.object({
    amount: z.number(),
    role: snowflakeSchema,
})

export class BulkInventoryGiveFlow extends BaseItemGiveFlow<z.infer<typeof bulkInventoryGiveParamsSchema>> {

    public override get id(): string { 
        return "bulk-inventory-give" 
    }

    protected override getMessage() {
        return t(
            `userFlows.inventoryGive.messages.bulkGive`, 
            { 
                amount: bold(`${this.params.amount}`), 
                item: bold(`[${formattedEmojiableName(this.selectedItem) || t("defaultComponents.selectItem")}]`), 
                role: roleMention(this.params.role) 
            }
        )
    }

    protected override async success(interaction: ButtonInteraction) {
        this.disableComponents()
        
        if (!this.selectedItem) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const targetUsersIds = (await interaction.guild?.roles.fetch(this.params.role))?.members.map(m => m.user.id) || []

        for (const userId of targetUsersIds) {
            const [error, targetId] = validate(snowflakeSchema, userId)
            if (error) return updateAsErrorMessage(interaction, error.message)

            const [error1, account] = await getOrCreateAccount(targetId)
            if (error1) return updateAsErrorMessage(interaction, error1.message)
            
            const currentBalance = account.inventory[this.selectedItem.id] || 0
            const [error2, _] = await setAccountItemAmount(targetId, this.selectedItem.id, currentBalance + this.params.amount)

            if (error2) return updateAsErrorMessage(interaction, error2.message)
        }

        const message = t(
            `userFlows.inventoryGive.messages.bulkGiveSuccess`, 
            { 
                amount: bold(`${this.params.amount}`), 
                item: formattedEmojiableName(this.selectedItem), 
                role: roleMention(this.params.role) 
            }
        )

        if (interaction.guild) {
            logToDiscord(interaction.guild, `${interaction.member} gave **${this.params.amount} ${formattedEmojiableName(this.selectedItem)}** to ${roleMention(this.params.role)}`)
        }

        return await updateAsSuccessMessage(interaction, message)
    }
}
