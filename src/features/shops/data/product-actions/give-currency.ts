import { t } from "@/core/i18n/i18n.js"
import { getOrCreateAccount } from "@/core/services/accounts/accounts.services.js"
import { getCurrencies } from "@/core/services/currencies/currencies.services.js"
import { NanoId } from "@/database/database.types.js"
import { setAccountCurrencyAmount } from "@/features/accounts/services/accounts.services.js"
import { errorFormat, replyErrorMessage } from "@/lib/discord/answer-interactions.js"
import { err, ok } from "@/lib/error-handling.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { createComponent } from "@/lib/ui/ui-components/extended-components.js"
import { showValidatedEditModal } from "@/lib/ui/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { BrandedSnowflake, nanoIdSchema } from "@/schemas/utils.js"
import { formattedEmojiableName } from "@/utils/formatting.js"
import { bold, ButtonInteraction, ButtonStyle } from "discord.js"
import z from "zod"
import { ProductAction } from "./product-action.js"


const giveCurrencyActionSchema = z.object({
    kind: z.literal("give-currency"),
    options: z.object({
        currencyId: nanoIdSchema,
        amount: z.number().positive()
    })
})


export const giveCurrencyProductAction: ProductAction<"give-currency", typeof giveCurrencyActionSchema> = {
    name: "Give Currency",
    kind: "give-currency" as const, 
    schema: giveCurrencyActionSchema ,
    execute: async (member, { currencyId, amount }) => {
        const memberId = member.id as BrandedSnowflake

        const [error1, account] = await getOrCreateAccount(memberId)
        if (error1) return err(error1)

        const userCurrencyAmount = account.currencies[currencyId] || 0

        const [error2, res] = await setAccountCurrencyAmount(memberId, currencyId, userCurrencyAmount + amount)
        if (error2) return err(error2)

        return ok(t(
            `userInterfaces.buy.actionProducts.giveCurrency.message`, 
            { currency: bold(formattedEmojiableName(res.currency)), amount: bold(`${amount}`) }
        ))
    },

    hydrate: (options, hydrator) => {
        const [error, currency] = hydrator.hydrateCurrency(options.currencyId)
        if (error) return err(error)
        return ok({ 
            kind: "give-currency", 
            options: { 
                ...options, 
                currency 
            } 
        })
    },

    getMessage: (options, hydrator) => {

        const currencyString = options?.currencyId === undefined 
            ? t("defaultComponents.selectCurrency")
            : formattedEmojiableName(hydrator.hydrateCurrency(options?.currencyId)[1]) 
            ?? errorFormat(t("errorMessages.hydration.currencyDisplayFailed"))

        return t(`userFlows.productAdd.messages.actions.giveCurrency`, { 
            currency: bold(currencyString), 
            amount: bold(`${options?.amount ?? t("defaultComponents.unset")}`) 
        })
    },

    getEditComponents: (flowId, callback, update) => {
        let selectedCurrencyId: NanoId | null = null
        let selectedAmount: number | null = null

        const currencySelectMenu = new ExtendedStringSelectMenuComponent(
            {
                customId: `${flowId}+select-currency`,
                placeholder: t("defaultComponents.selectCurrency"),
                time: 120_000
            },
            getCurrencies(), 
            (interaction) => update(interaction),
            (interaction , selected) => {
                selectedCurrencyId = selected.id
                callback(interaction, { kind: "give-currency", options: { currencyId: selected.id, amount: 1 }})
            }
        )

        const setAmountButton = new ExtendedButtonComponent(
            {
                customId: `${flowId}+set-amount`,
                label: t(`userFlows.productAdd.components.setAmountButton`),
                emoji: "🪙",
                style: ButtonStyle.Secondary,
                time: 120_000
            },
            async (interaction: ButtonInteraction) => {
                const [modalSubmit, [error, amount]] = await showValidatedEditModal(
                    interaction, 
                    { edit: t(`userFlows.productAdd.components.editAmountModalTitle`), previousValue: `${selectedAmount ?? "1"}` },
                    z.coerce.number().positive().transform(n => Math.floor(n))
                )

                if (error) return replyErrorMessage(modalSubmit, error.message)
                if (!selectedCurrencyId) return update(modalSubmit)
                
                selectedAmount = amount
                callback(modalSubmit, { kind: "give-currency", options: { currencyId: selectedCurrencyId, amount }})
            }
        ) // could be replaced with a system similar to "select price element"

        return [
            createComponent(currencySelectMenu),
            createComponent(setAmountButton, () => setAmountButton.toggle(selectedCurrencyId != null))
        ]
    }
}
