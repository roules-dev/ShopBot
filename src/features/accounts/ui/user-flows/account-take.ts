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
import { showConfirmationModal } from "@/lib/ui/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { snowflakeSchema } from "@/schemas/utils.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { ButtonInteraction, ButtonStyle, bold, userMention } from "discord.js"
import z from "zod"
import { emptyAccount, setAccountCurrencyAmount } from "../services/accounts.services.js"


export const accountTakeParamsSchema = z.object({
    amount: z.number(),
    target: z.looseObject({ id: snowflakeSchema }),
})

export class AccountTakeFlow extends UserFlow<z.infer<typeof accountTakeParamsSchema>> {
    public override get id(): string { 
        return "account-take" 
    }

    private selectedCurrency: Currency & Identifiable<NanoId> | null = null

    protected override async prestart() {
        const currencies = getCurrencies();
        if (!currencies.size) 
            return err(`${t(`userFlows.accountTake.errorMessages.cantTakeMoney`)} ${t("errorMessages.noCurrencies")}`);
        return ok(true);
    }

    protected override getMessage() {
        return t(
            `userFlows.accountTake.messages.default`, 
            { 
                amount: bold(`${this.params.amount}`), 
                currency: bold(`[${formattedEmojiableName(this.selectedCurrency) || t("defaultComponents.selectCurrency")}]`), 
                user: userMention(this.params.target.id) 
            }
        )
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
                label: t(`userFlows.accountTake.components.submitButton`),
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
                label: t(`userFlows.accountTake.components.takeAllButton`),
                emoji: "🔥",
                style: ButtonStyle.Danger,
                disabled: true,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                if (!this.selectedCurrency) return this.updateInteraction(interaction)

                const [error, account] = await getOrCreateAccount(this.params.target.id)
                if (error) return updateAsErrorMessage(interaction, error.message)

                this.params.amount = account.currencies[this.selectedCurrency.id] || 0
                this.success(interaction)
            }
        )

        const emptyAccountButton = new ExtendedButtonComponent(
            {
                customId: `${this.id}+empty-account`,
                label: t(`userFlows.accountTake.components.emptyAccountButton`),
                emoji: "🗑️",
                style: ButtonStyle.Danger,
                time: 120_000,
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmitInteraction, confirmed] = await showConfirmationModal(interaction)

                if (!confirmed) return this.updateInteraction(modalSubmitInteraction)

                const [error] = await emptyAccount(this.params.target.id, "currencies")
                if (error) return updateAsErrorMessage(modalSubmitInteraction, error.message)

                await updateAsSuccessMessage(modalSubmitInteraction, t(`userFlows.accountTake.messages.successfullyEmptied`, { user: userMention(this.params.target.id) }))
            }
        )


        return [
            createComponent(currencySelectMenu),
            createComponent(submitButton, () => submitButton.toggle(this.selectedCurrency != null)),
            createComponent(takeAllButton, () => takeAllButton.toggle(this.selectedCurrency != null)),
            createComponent(emptyAccountButton),
        ]
    }


    protected async success(interaction: ButtonInteraction) {
        this.disableComponents()

        if (!this.selectedCurrency) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const targetId = this.params.target.id

        const [error, account] = await getOrCreateAccount(targetId)
        if (error) return updateAsErrorMessage(interaction, error.message)

        const currentBalance = account.currencies[this.selectedCurrency.id] || 0
        const newBalance = Math.max(currentBalance - this.params.amount, 0)
        
        const [error2, _] = await setAccountCurrencyAmount(targetId, this.selectedCurrency.id, newBalance)
        if (error2) return updateAsErrorMessage(interaction, error2.message)

        const successMessage = t(
            `userFlows.accountTake.messages.success`, 
            { 
                amount: bold(`${this.params.amount}`), 
                currency: formattedEmojiableName(this.selectedCurrency), 
                user: userMention(this.params.target.id) 
            }
        )

        if (interaction.guild) {
            logToDiscord(interaction.guild, `${interaction.member} took **${this.params.amount} ${this.selectedCurrency.name}** from ${userMention(this.params.target.id)}`)
        }

        return await updateAsSuccessMessage(interaction, successMessage)

    }
}