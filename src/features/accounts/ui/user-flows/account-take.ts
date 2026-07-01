import { logToDiscord } from "@/app/services/logging.js"
import { HYDRATOR } from "@/core/database/init-databases.js"
import { t } from "@/core/i18n/i18n.js"
import { getOrCreateAccount } from "@/core/services/accounts/accounts.services.js"
import { getCurrencies } from "@/core/services/currencies/currencies.services.js"
import { NanoId } from "@/database/database.types.js"
import { Currency } from "@/features/currencies/database/currencies.types.js"
import { updateAsErrorMessage, updateAsSuccessMessage } from "@/lib/discord/answer-interactions.js"
import { err, ok } from "@/lib/error-handling.js"
import { Identifiable } from "@/lib/types/core.js"
import { ExtendedButtonComponent } from "@/lib/ui/components/button.js"
import { ComponentSeparator, createComponent } from "@/lib/ui/components/extended-components.js"
import { showConfirmationModal } from "@/lib/ui/components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/components/string-select-menu.js"
import { UserFlow } from "@/lib/ui/user-flows/user-flow.js"
import { snowflakeSchema } from "@/schemas/utils.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { ButtonInteraction, ButtonStyle, bold, userMention } from "discord.js"
import z from "zod"
import { emptyAccount, setAccountCurrencyAmount } from "../../services/accounts.services.js"


export const accountTakeParamsSchema = z.object({
    amount: z.number(),
    target: snowflakeSchema,
})

export class AccountTakeFlow extends UserFlow<z.infer<typeof accountTakeParamsSchema>> {
    public override get id(): string { 
        return "account-take" 
    }

    private selectedCurrency: Currency & Identifiable<NanoId> | null = null

    protected override async prepare() {
        const currencies = getCurrencies();
        if (!currencies.size) 
            return err(`${t(`userFlows.accountTake.errorMessages.cantTakeMoney`)} ${t("errorMessages.noCurrencies")}`)

        await this.populateCurrenctSelectMenu()

        return ok(true);
    }

    protected override getMessage() {
        return t(
            `userFlows.accountTake.messages.default`, 
            { 
                amount: bold(`${this.params.amount}`), 
                currency: bold(`[${formattedEmojiableName(this.selectedCurrency) || t("defaultComponents.selectCurrency")}]`), 
                user: userMention(this.params.target) 
            }
        )
    }

    protected override initComponents() {
        const currencySelectMenu = new ExtendedStringSelectMenuComponent(
            { customId: `${this.id}+select-currency`, placeholder: t("defaultComponents.selectCurrency"), time: 120_000 },
            new Map<NanoId, Currency>(),
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

                const [error, account] = await getOrCreateAccount(this.params.target)
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
                const [modalSubmitInteraction, confirmed] = await showConfirmationModal(
                    interaction,
                    t(`userFlows.accountTake.components.confirmationModalTitle`, { user: userMention(this.params.target) })
                )

                if (!confirmed) return this.updateInteraction(modalSubmitInteraction)

                const [error] = await emptyAccount(this.params.target, "currencies")
                if (error) return updateAsErrorMessage(modalSubmitInteraction, error.message)

                await updateAsSuccessMessage(modalSubmitInteraction, t(`userFlows.accountTake.messages.successfullyEmptied`, { user: userMention(this.params.target) }))
            }
        )


        return [
            createComponent(currencySelectMenu),
            createComponent(submitButton, () => submitButton.toggle(this.selectedCurrency != null)),
            createComponent(takeAllButton, () => takeAllButton.toggle(this.selectedCurrency != null)),
            createComponent(emptyAccountButton),
        ]
    }

    private async populateCurrenctSelectMenu() {
        const [error, account] = await getOrCreateAccount(this.params.target)
        if (error) throw error

        const [error2, currencies] = HYDRATOR.getHydratedAccountCurrencies(account)
        if (error2) throw error2

        const currenciesMap = new Map<NanoId, Currency>()
        for (const [currenctId, currencyBalance] of currencies) {
            currenciesMap.set(currenctId, currencyBalance.resource)
        }

        const currencySelectMenu = this.components.get(`${this.id}+select-currency`)
        if (!currencySelectMenu) throw new Error("Unexpected error: currencySelectMenu is null")
        if (currencySelectMenu instanceof ComponentSeparator || !(currencySelectMenu.comp instanceof ExtendedStringSelectMenuComponent)) throw new Error("Unexpected error: currencySelectMenu is not ExtendedStringSelectMenuComponent")
        
        currencySelectMenu.comp.updateMap(currenciesMap)
    }


    protected async success(interaction: ButtonInteraction) {
        this.disableComponents()

        if (!this.selectedCurrency) return updateAsErrorMessage(interaction, t("errorMessages.insufficientParameters"))
        
        const targetId = this.params.target

        const [error, account] = await getOrCreateAccount(targetId)
        if (error) return updateAsErrorMessage(interaction, error.message)

        const prevBalance = account.currencies[this.selectedCurrency.id] || 0
        const newBalance = Math.max(prevBalance - this.params.amount, 0)
        
        const [error2, _] = await setAccountCurrencyAmount(targetId, this.selectedCurrency.id, newBalance)
        if (error2) return updateAsErrorMessage(interaction, error2.message)

        const takenAmount = Math.min(prevBalance, this.params.amount)

        const successMessage = t(
            `userFlows.accountTake.messages.success`, 
            { 
                amount: bold(`${takenAmount}`), 
                currency: formattedEmojiableName(this.selectedCurrency), 
                user: userMention(this.params.target) 
            }
        )

        if (interaction.guild) {
            logToDiscord(interaction.guild, `${interaction.member} took **${takenAmount} ${formattedEmojiableName(this.selectedCurrency)}** from ${userMention(this.params.target)}`)
        }

        return await updateAsSuccessMessage(interaction, successMessage)

    }
}