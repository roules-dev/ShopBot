import { HydratedPrice } from "@/core/database/hydrator.js"
import { HYDRATOR } from "@/core/database/init-databases.js"
import { getCurrencies } from "@/core/services/currencies/currencies.services.js"
import { errorFormat } from "@/lib/discord/answer-interactions.js"
import { ErrorLike, Result, err, ok } from "@/lib/error-handling.js"
import { MapKey } from "@/lib/types/collections.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { ExtendedButtonComponent } from "@/lib/ui/components/button.js"
import { showModal, showValidatedSingleInputModal } from "@/lib/ui/components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/components/string-select-menu.js"
import { ButtonStyle, ChatInputCommandInteraction, LabelBuilder, MessageComponentInteraction, ModalBuilder, ModalSubmitInteraction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js"
import z from "zod"
import { priceFormat } from "../../services/price.js"
import { t } from "@/core/i18n/i18n.js"

export type PriceElementComponentsStrings = {
    addToPrice: string,
    editAmountModalTitle: string,

    priceElement: string,
    priceElementRemove: string,
    priceElementSelect: string,
    noPriceElementSelected: string
}

export function getPriceElementComponents(
    flowId: string, 
    previousPrice: Record<string, number> | null, 
    strings: PriceElementComponentsStrings,
    onPriceSet: (price: Record<string, number>) => void, 
    update: (interaction: UserInterfaceInteraction, additionalMessage?: string) => void
) {

    let price = previousPrice

    const addPriceWithCurrencySelect = new ExtendedStringSelectMenuComponent(
        {
            customId: `${flowId}+select-currency`,
            placeholder: strings.addToPrice,
            time: 120_000
        },
        getCurrencies(),
        (interaction) => update(interaction),
        async (interaction, selectedCurrency) => {
            price = price ?? {}
            
            const previousAmount = price[selectedCurrency.id]
            
            const [modalSubmit, [error, amount]] = await showValidatedSingleInputModal(interaction, {
                id: `${flowId}+amount`,
                title: strings.editAmountModalTitle,
                inputLabel: strings.editAmountModalTitle,
                placeholder: previousAmount?.toString() ?? strings.editAmountModalTitle,
                required: true
            }, z.coerce.number().positive())

            if (error) {
                if (error.name === "ModalTimeout") return
                return update(modalSubmit, errorFormat(t("errorMessages.noAnswer")))
            }

            price[selectedCurrency.id] = amount
            onPriceSet(price)
            
            update(modalSubmit)
        }
    )
    const removePriceElementButton = new ExtendedButtonComponent(
        {
            customId: `${flowId}+remove-price-element`,
            emoji: "➖",
            style: ButtonStyle.Primary,
            time: 120_000
        },
        async (interaction) => {
            const [error1, hydratedPrice] = HYDRATOR.getHydratedPrice(price ?? {})
            if (error1) {
                update(interaction, errorFormat(t("errorMessages.hydration.priceDisplayFailed")))
                return
            }
            const [modalSubmit, [error2, priceElementCurrencyId]] = await showPriceElementSelectModal(interaction, {
                id: flowId, 
                strings 
            }, hydratedPrice)

            if (error2) {
                if (error2.name === "ModalTimeout") return

                return update(modalSubmit, errorFormat(t("errorMessages.noAnswer"))) 
            }

            price = price ?? {}
            delete price[priceElementCurrencyId]

            onPriceSet(price)
            update(modalSubmit)
        }
    )
    return {
        addPriceWithCurrencySelect,
        removePriceElementButton: removePriceElementButton
    }
}



async function showPriceElementSelectModal( 
    interaction: MessageComponentInteraction | ChatInputCommandInteraction,
    { id, strings }: { 
        id: string, 
        strings: PriceElementComponentsStrings, 
    }, 
    hydratedPrice: HydratedPrice
): Promise<[
    ModalSubmitInteraction | MessageComponentInteraction | ChatInputCommandInteraction, 
    Result<MapKey<HydratedPrice>, ErrorLike<"Error"> | ErrorLike<"ModalTimeout">>]
> {
    const modal = new ModalBuilder()
        .setCustomId(id)
        .setTitle(strings.priceElementRemove)

    const SELECT_ID = `${id}+price-element-select`
    const priceElementSelect = new StringSelectMenuBuilder()
        .setCustomId(`${id}+price-element-select`)
        .setPlaceholder(strings.priceElementSelect)

    const options: StringSelectMenuOptionBuilder[] = []
    hydratedPrice.forEach((value, key) => {
        const option = new StringSelectMenuOptionBuilder()
            .setLabel(`${priceFormat(value.amount)} ${value.resource.name}`)
            .setValue(key)

        if (value.resource.emoji != undefined && value.resource.emoji.length > 0) {
            option.setEmoji(value.resource.emoji)
        }

        options.push(option)
    })
    
    priceElementSelect.setOptions(options)

    const priceElementLabel = new LabelBuilder()
        .setLabel(strings.priceElement)
        .setStringSelectMenuComponent(priceElementSelect)

    modal.addLabelComponents(priceElementLabel)

    const [modalSubmit, [error, fields]] = await showModal(interaction, modal)
    if (error) return [modalSubmit, err(error)]

    const inputValue = fields.getStringSelectValues(SELECT_ID)[0]
    if (!inputValue) return [modalSubmit, err(strings.noPriceElementSelected)]

    return [modalSubmit, ok(inputValue as MapKey<HydratedPrice>)]

}