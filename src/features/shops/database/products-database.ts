import { DatabaseError } from "@/database/database-types.js";
import { ProductOptions, ProductOptionsOptional } from "@/features/shops/database/products-types.js";
import { getShops, shopsDatabase } from "@/features/shops/database/shops-database.js";
import { err, ok } from "@/lib/error-handling.js";
import { nanoid } from "nanoid";

export function getProducts(shopId: string){
    if (!getShops().has(shopId)) {
        return err(new DatabaseError("ShopDoesNotExist"))
    }

    return ok(getShops().get(shopId)!.products)
}

export async function addProduct(shopId: string, options: ProductOptions) {
    if (!getShops().has(shopId)) return err(new DatabaseError("ShopDoesNotExist"));

    const id = nanoid();
    const product = Object.assign({ id, shopId }, options);

    getShops().get(shopId)!.products.set(id, product);
    await shopsDatabase.save();

    return ok(getShops().get(shopId)!.products.get(id)!);
}

export async function removeProduct(shopId: string, productId: string) {
    if (!getShops().has(shopId))return err(new DatabaseError("ShopDoesNotExist"));

    getShops().get(shopId)!.products.delete(productId);
    await shopsDatabase.save();
    return ok(true);
}
export async function updateProduct(
    shopId: string,
    productId: string,
    options: ProductOptionsOptional,
) {
    if (!getShops().has(shopId)) return err(new DatabaseError("ShopDoesNotExist"));

    const { name, description, price, emoji, action, amount } = options;
    const product = getShops().get(shopId)!.products.get(productId);

    if (!product) return err(new DatabaseError("ProductDoesNotExist"));

    // TODO: to be refactored (if elses are horrible)
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
    return ok(product);
}

export function getProductName( shopId: string | undefined, productId: string | undefined) {
    if (!shopId || !productId) return undefined;

    const product = getShops().get(shopId)?.products.get(productId);
    if (!product) return undefined;

    return `${product.emoji != "" ? `${product.emoji} ` : ""}${product.name}`;
}
