import { DatabaseError, DatabaseErrors } from "@/database/database-types.js";
import { nanoid } from "nanoid";
import {
    Product,
    ProductOptions,
    ProductOptionsOptional,
} from "./products-types.js";
import { getShops, shopsDatabase } from "./shops-database.js";

export function getProducts(shopId: string): Map<string, Product> {
    if (!getShops().has(shopId))
        throw new DatabaseError(DatabaseErrors.ShopDoesNotExist);

    return getShops().get(shopId)!.products;
}

export async function addProduct(shopId: string, options: ProductOptions) {
    if (!getShops().has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist);

    const id = nanoid();
    const product = Object.assign({ id, shopId }, options);

    getShops().get(shopId)!.products.set(id, product);
    await shopsDatabase.save();

    return getShops().get(shopId)!.products.get(id)!;
}

export async function removeProduct(shopId: string, productId: string) {
    if (!getShops().has(shopId))throw new DatabaseError(DatabaseErrors.ShopDoesNotExist);

    getShops().get(shopId)!.products.delete(productId);
    await shopsDatabase.save();
}
export async function updateProduct(
    shopId: string,
    productId: string,
    options: ProductOptionsOptional,
) {
    // TODO: to be refactored (if elses are horrible)
    if (!getShops().has(shopId)) throw new DatabaseError(DatabaseErrors.ShopDoesNotExist);

    const { name, description, price, emoji, action, amount } = options;
    const product = getShops().get(shopId)!.products.get(productId);

    if (!product) throw new DatabaseError(DatabaseErrors.ProductDoesNotExist);

    if (name) product.name = name;
    if (description) product.description = description;
    if (price != undefined) product.price = price;
    if (emoji) product.emoji = emoji;
    if (action) product.action = action;
    if (amount != undefined) {
        if (amount == -1) product.amount = undefined;
        else product.amount = amount;
    }

    await shopsDatabase.save();
}

export function getProductName(
    shopId: string | undefined,
    productId: string | undefined,
): string | undefined {
    if (!shopId || !productId) return undefined;

    const product = getShops().get(shopId)?.products.get(productId);
    if (!product) return undefined;

    return `${product.emoji != "" ? `${product.emoji} ` : ""}${product.name}`;
}
