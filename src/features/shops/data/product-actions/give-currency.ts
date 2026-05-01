import { t } from "@/core/i18n/i18n.js"
import { getOrCreateAccount } from "@/core/services/accounts/accounts.services.js"
import { setAccountCurrencyAmount } from "@/features/accounts/services/accounts.services.js"
import { err, ok } from "@/lib/error-handling.js"
import { BrandedSnowflake, NanoIdSchema } from "@/schemas/utils.js"
import { bold } from "discord.js"
import z from "zod"
import { ProductAction } from "./product-action.js"


export const giveCurrencyActionSchema = z.object({
    kind: z.literal("give-currency"),
    options: z.object({
        currencyId: NanoIdSchema,
        amount: z.number().positive()
    })
})


export const giveCurrencyProductAction: ProductAction<"give-currency", typeof giveCurrencyActionSchema> = {
    name: "Give Currency",
    kind: "give-currency" as const, 
    schema: giveCurrencyActionSchema,
    execute: async (member, { currencyId, amount }) => {
        const memberId = member.id as BrandedSnowflake

        const [error1, account] = await getOrCreateAccount(memberId)
        if (error1) return err(error1)

        const userCurrencyAmount = account.currencies[currencyId] || 0

        const [error2, res] = await setAccountCurrencyAmount(memberId, currencyId, userCurrencyAmount + amount)
        if (error2) return err(error2)

        return ok(t(
            `userInterfaces.buy.actionProducts.giveCurrency.message`, 
            { currency: bold(res.currency.name), amount: bold(`${amount}`) }
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
    }
}
