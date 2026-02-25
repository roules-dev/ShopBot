import { Product } from "../database/products-types.js"

export function formattedProductName(product: Product): string
export function formattedProductName(product: Product | undefined | null): string | undefined
export function formattedProductName(product: Product | undefined | null) {
    if (product === undefined || product === null) return undefined

    return `${product.emoji != "" ? `${product.emoji} ` : ""}${product.name}`
}
