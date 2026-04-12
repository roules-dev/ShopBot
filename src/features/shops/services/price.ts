import { HydratedPrice } from "@/core/database/hydrator.js";
import { MapValue } from "@/lib/types/collections.js";
import { formattedEmojiableName } from "@/utils/formatting.js";

function discounted(price: number, discount: number) {
    return price * (1 - discount / 100)
}

function formatOneCurrencyPrice(price: MapValue<HydratedPrice>, discount?: number) {
    if (discount !== undefined && discount > 0) {
        return `~~${price.amount.toFixed(2)}~~ ${discounted(price.amount, discount).toFixed(2)} ${formattedEmojiableName(price.resource)}`
    }

    return `${price.amount.toFixed(2)} ${formattedEmojiableName(price.resource)}`
}

export function formatPrice(price: HydratedPrice, discount?: number) {
    return Array.from(price.values())
        .map(onCurrencyPrice => formatOneCurrencyPrice(onCurrencyPrice, discount))
        .join(", ")
}

export function applyDiscount(price: HydratedPrice, discount: number) {
    const discountedPrice: HydratedPrice = new Map()

    price.forEach(( { amount, resource }, _currencyId, ) => {
        discountedPrice.set(_currencyId, { amount: discounted(amount, discount), resource })
    })

    return discountedPrice
}

export function applyQuantity(price: HydratedPrice, quantity: number) {
    const newPrice: HydratedPrice = new Map()

    price.forEach(( { amount, resource }, _currencyId, ) => {
        newPrice.set(_currencyId, { amount: amount * quantity, resource })
    })

    return newPrice
}
