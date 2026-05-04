import { HydratedPrice } from "@/core/database/hydrator.js"
import { HYDRATOR } from "@/core/database/init-databases.js"
import { getCurrencies } from "@/core/services/currencies/currencies.services.js"
import { ErrorLike, Result, err, ok } from "@/lib/error-handling.js"
import { MapKey } from "@/lib/types/collections.js"
import { UserInterfaceInteraction } from "@/lib/ui/types/ui.js"
import { ExtendedButtonComponent } from "@/lib/ui/ui-components/button.js"
import { showModal, showValidatedSingleInputModal } from "@/lib/ui/ui-components/modals.js"
import { ExtendedStringSelectMenuComponent } from "@/lib/ui/ui-components/string-select-menu.js"
import { ButtonStyle, ChatInputCommandInteraction, LabelBuilder, MessageComponentInteraction, ModalBuilder, ModalSubmitInteraction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js"
import z from "zod"
import { priceFormat } from "../../services/price.js"

export function getPricePieceComponents(flowId: string, previousPrice: Record<string, number> | null, onPriceSet: (price: Record<string, number>) => void, update: (interaction: UserInterfaceInteraction) => void) {
    let price = previousPrice

    const addPriceWithCurrencySelect = new ExtendedStringSelectMenuComponent(
        {
            customId: `${flowId}+select-currency`,
            placeholder: "➕ Add to price (or update)",
            time: 120_000
        },
        getCurrencies(),
        (interaction) => update(interaction),
        async (interaction, selectedCurrency) => {
            price = price ?? {}
            
            const previousAmount = price[selectedCurrency.id]
            
            const [modalSubmit, [error, amount]] = await showValidatedSingleInputModal(interaction, {
                id: `${flowId}+amount`,
                title: "Amount",
                inputLabel: "Amount",
                placeholder: previousAmount?.toString() ?? "Amount",
                required: true
            }, z.coerce.number().positive())

            if (error) {
                if (error.name === "ModalTimeout") return
                return update(modalSubmit) // TODO it should not fail silently
            }

            price[selectedCurrency.id] = amount
            onPriceSet(price)
            
            update(modalSubmit)
        }
    )
    const removePricePieceButton = new ExtendedButtonComponent(
        {
            customId: `${flowId}+remove-price-piece`,
            emoji: "➖",
            style: ButtonStyle.Primary,
            time: 120_000
        },
        async (interaction) => {
            const [error1, hydratedPrice] = HYDRATOR.getHydratedPrice(price ?? {})
            if (error1) {
                update(interaction)
                return // TODO it should not fail silently
            }
            const [modalSubmit, [error2, pricePieceCurrencyId]] = await showPricePieceSelectModal(interaction, {id: flowId, title: "Remove price piece" }, hydratedPrice)

            if (error2) {
                if (error2.name === "ModalTimeout") return

                return update(modalSubmit) // TODO it should not fail silently
            }

            price = price ?? {}
            delete price[pricePieceCurrencyId]

            onPriceSet(price)
            update(modalSubmit)
        }
    )
    return {
        addPriceWithCurrencySelect,
        removePricePieceButton
    }
}



async function showPricePieceSelectModal( 
    interaction: MessageComponentInteraction | ChatInputCommandInteraction,
    { id, title }: { 
        id: string, 
        title: string 
    }, 
    hydratedPrice: HydratedPrice
): Promise<[
    ModalSubmitInteraction | MessageComponentInteraction | ChatInputCommandInteraction, 
    Result<MapKey<HydratedPrice>, ErrorLike<"Error"> | ErrorLike<"ModalTimeout">>]
> {
    const modal = new ModalBuilder()
        .setCustomId(id)
        .setTitle(title)

    const SELECT_ID = `${id}+price-piece-select`
    const pricePieceSelect = new StringSelectMenuBuilder()
        .setCustomId(`${id}+price-piece-select`)
        .setPlaceholder("Select price piece")

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
    
    pricePieceSelect.setOptions(options)

    const pricePieceLabel = new LabelBuilder()
        .setLabel("Price piece")
        .setStringSelectMenuComponent(pricePieceSelect)

    modal.addLabelComponents(pricePieceLabel)

    const [modalSubmit, [error, fields]] = await showModal(interaction, modal)
    if (error) return [modalSubmit, err(error)]

    const inputValue = fields.getStringSelectValues(SELECT_ID)[0]
    if (!inputValue) return [modalSubmit, err("No price piece selected")]

    return [modalSubmit, ok(inputValue as MapKey<HydratedPrice>)]

}