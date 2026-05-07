import { HydratedPrice } from "@/core/database/hydrator.js";
import { getLocale } from "@/core/i18n/i18n.js";
import { NanoId } from "@/database/database.types.js";
import { MapValue } from "@/lib/types/collections.js";
import { formattedEmojiableName } from "@/utils/formatting.js";
import { objectEntries } from "@/utils/objects.js";

export const MAX_PRICE_LENGTH = 20

function discounted(price: number, discount: number) {
    return price * (1 - discount / 100)
}

export function priceFormat(price: number) {
    return price.toLocaleString(getLocale(), { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    })
}

function formatPriceElement(price: MapValue<HydratedPrice>, discount?: number) {
    if (discount !== undefined && discount > 0) {
        return `~~${priceFormat(price.amount)}~~ ${priceFormat(discounted(price.amount, discount))} ${formattedEmojiableName(price.resource)}`
    }

    return `${priceFormat(price.amount)} ${formattedEmojiableName(price.resource)}`
}

export function formatPrice(price: HydratedPrice, discount?: number) {
    return Array.from(price.values())
        .map(onCurrencyPrice => formatPriceElement(onCurrencyPrice, discount))
        .join(", ")
}

export function applyDiscountHydrated(price: HydratedPrice, discount: number) {
    const discountedPrice: HydratedPrice = new Map()

    price.forEach(( { amount, resource }, _currencyId, ) => {
        discountedPrice.set(_currencyId, { amount: discounted(amount, discount), resource })
    })

    return discountedPrice
}

export function applyQuantityHydrated(price: HydratedPrice, quantity: number) {
    const newPrice: HydratedPrice = new Map()

    price.forEach(( { amount, resource }, _currencyId, ) => {
        newPrice.set(_currencyId, { amount: amount * quantity, resource })
    })

    return newPrice
}

export function applyQuantityAndDiscount(price: Record<NanoId, number>, quantity: number, discount: number) {
    const newPrice: Record<NanoId, number> = {}

    for (const [currencyId, amount] of objectEntries(price)) {
        newPrice[currencyId] = discounted(amount, discount) * quantity
    }

    return newPrice
}