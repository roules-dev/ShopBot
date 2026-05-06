import { logToDiscord } from "@/app/services/logging.js"
import { t } from "@/core/i18n/i18n.js"
import { getOrCreateAccount } from "@/core/services/accounts/accounts.services.js"
import { getCurrencies } from "@/core/services/currencies/currencies.services.js"
import { NanoId } from "@/database/database.types.js"
import { Currency } from "@/features/currencies/database/currencies.types.js"
import { updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js"
import { err, ok } from "@/lib/error-handling.js"
import { Identifiable } from "@/lib/types/core.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { validate } from "@/lib/validation/validation.js"
import { snowflakeSchema } from "@/schemas/utils.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { ButtonInteraction, ButtonStyle, bold, roleMention, userMention } from "discord.js"
import z from "zod"
import { setAccountCurrencyAmount } from "../../services/accounts.services.js"


abstract class BaseCurrencyGiveFlow<T extends Record<string, unknown>> extends UserFlow<T> {
    protected selectedCurrency: Currency & Identifiable<NanoId> | null = null;

    protected override async prestart() {
        const currencies = getCurrencies();
        if (!currencies.size) 
            return err(`${t(`userFlows.accountGive.errorMessages.cantGiveMoney`)} ${t("errorMessages.noCurrencies")}`);
        return ok(true);
    }

    protected override initComponents() {
        const currencySelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-currency`, placeholder: t("defaultComponents.selectCurrency"), time: 120_000 },
            getCurrencies(),
            (interaction) => this.updateInteraction(interaction),
            (interaction, selectedCurrency) => {
                this.selectedCurrency = selectedCurrency
                this.updateInteraction(interaction)
            }
        )

        const submitButton = new ExtendedButtonComponent(
            { 
                customId: `${this.id}+submit`, 
                label: t(`userFlows.accountGive.components.submitButton`), 
                emoji: "✅", 
                style: ButtonStyle.Success, 
                disabled: true,
                time: 120_000, 
            },
            (interaction: ButtonInteraction) => this.success(interaction)
        )
    
        return [
            createComponent(currencySelectMenu),
            createComponent(submitButton, () => submitButton.toggle(this.selectedCurrency != null)),
        ]
    }
}


export const accountGiveParamsSchema = z.object({
    amount: z.number(),
    target: snowflakeSchema,
})

export class AccountGiveFlow extends BaseCurrencyGiveFlow<z.infer<typeof accountGiveParamsSchema>> {
    public get id() { return "account-give" }

    protected override getMessage() {
        return t(
            `userFlows.accountGive.messages.default`, 
            { 
                amount: bold(`${this.params.amount}`), 
                currency: bold(`[${formattedEmojiableName(this.selectedCurrency) || t("defaultComponents.selectCurrency")}]`), 
                user: userMention(this.params.target) 
            }
        )
    }

    protected async success(interaction: ButtonInteraction) {
        this.disableComponents()
        
        if (!this.selectedCurrency) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const targetId = this.params.target

        const [error, account] = await getOrCreateAccount(targetId)
        if (error) return updateAsErrorMessage(interaction, error.message)

        const currentBalance = account.currencies[this.selectedCurrency.id] || 0
        const [error2, _] = await setAccountCurrencyAmount(targetId, this.selectedCurrency.id, currentBalance + this.params.amount)

        if (error2) return updateAsErrorMessage(interaction, error2.message)
        
        const successMessage = t(
            `userFlows.accountGive.messages.success`, 
            { 
                amount: bold(`${this.params.amount}`), 
                currency: formattedEmojiableName(this.selectedCurrency), 
                user: userMention(this.params.target) 
            }
        )

        if (interaction.guild) {
            logToDiscord(interaction.guild, `${interaction.member} gave **${this.params.amount} ${formattedEmojiableName(this.selectedCurrency)}** to ${userMention(this.params.target)}`)
        }

        return await updateAsSuccessMessage(interaction, successMessage)
    }
}

export const bulkAccountGiveParamsSchema = z.object({
    amount: z.number(),
    role: snowflakeSchema,
})

export class BulkAccountGiveFlow extends BaseCurrencyGiveFlow<z.infer<typeof bulkAccountGiveParamsSchema>> {

    public override get id(): string { 
        return "bulk-account-give" 
    }

    protected override getMessage() {
        return t(
            `userFlows.accountGive.messages.bulkGive`, 
            { 
                amount: bold(`${this.params.amount}`), 
                currency: bold(`[${formattedEmojiableName(this.selectedCurrency) || t("defaultComponents.selectCurrency")}]`), 
                role: roleMention(this.params.role) 
            }
        )
    }

    protected override async success(interaction: ButtonInteraction) {
        this.disableComponents()
        
        if (!this.selectedCurrency) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const targetUsersIds = (await interaction.guild?.roles.fetch(this.params.role))?.members.map(m => m.user.id) || []

        for (const userId of targetUsersIds) {
            const [error, targetId] = validate(snowflakeSchema, userId)
            if (error) return updateAsErrorMessage(interaction, error.message)

            const [error1, account] = await getOrCreateAccount(targetId)
            if (error1) return updateAsErrorMessage(interaction, error1.message)
            
            const currentBalance = account.currencies[this.selectedCurrency.id] || 0
            const [error2, _] = await setAccountCurrencyAmount(targetId, this.selectedCurrency.id, currentBalance + this.params.amount)

            if (error2) return updateAsErrorMessage(interaction, error2.message)
        }

        const message = t(
            `userFlows.accountGive.messages.bulkGiveSuccess`, 
            { 
                amount: bold(`${this.params.amount}`), 
                currency: formattedEmojiableName(this.selectedCurrency), 
                role: roleMention(this.params.role) 
            }
        )

        if (interaction.guild) {
            logToDiscord(interaction.guild, `${interaction.member} gave **${this.params.amount} ${formattedEmojiableName(this.selectedCurrency)}** to ${roleMention(this.params.role)}`)
        }

        return await updateAsSuccessMessage(interaction, message)
    }
}
