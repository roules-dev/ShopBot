
import { ApiError, Balance, NanoId } from "@/database/database.types.js"
import { Account } from "@/features/accounts/database/accounts.type.js"
import { Currency } from "@/features/currencies/database/currencies.types.js"
import { Item } from "@/features/items/database/items.types.js"
import { productActions } from "@/features/shops/data/product-actions/index.js"
import { Product } from "@/features/shops/database/products.types.js"
import { err, ok } from "@/lib/error-handling.js"
import { Emojiable, Identifiable, Labelled } from "@/lib/types/core.js"
import { AwaitedObjectResultReturn } from "@/lib/types/helpers.js"
import { BrandedSnowflake } from "@/schemas/utils.js"
import { objectEntries } from "@/utils/objects.js"
import { AccountsDatabase, CurrenciesDatabase, ItemsDatabase, ShopsDatabase } from "./database.types.js"

export type HydratedPrice = Map<NanoId, Balance<Currency>>

export class Hydrator {
    private currenciesDb: CurrenciesDatabase
    private itemsDb: ItemsDatabase
    private shopsDb: ShopsDatabase
    private accountsDb: AccountsDatabase

    constructor(
        currenciesDb: CurrenciesDatabase,
        itemsDb: ItemsDatabase,
        shopsDb: ShopsDatabase,
        accountsDb: AccountsDatabase
    ) {
        this.currenciesDb = currenciesDb
        this.itemsDb = itemsDb
        this.shopsDb = shopsDb
        this.accountsDb = accountsDb
    }

    public hydrateCurrency(currencyId: NanoId) {
        const currencyRaw = this.currenciesDb.get(currencyId)
        if (!currencyRaw) return err(new ApiError("CurrencyDoesNotExist"))
        
        return ok({...currencyRaw, id: currencyId})
    }

    public hydrateItem(itemId: NanoId) {
        const itemRaw = this.itemsDb.get(itemId)
        if (!itemRaw) return err(new ApiError("ItemDoesNotExist"))
        
        return ok({
            ...itemRaw,
            id: itemId
        })
    }

    public getHydratedProductAction(product: Product) {
        if (!product.action) return err("NoActionToHydrate")
        
        return productActions[product.action.kind].hydrate(product.action.options, this)
    }


    public getHydratedPrice(price: Record<NanoId, number>) {
        let hydratedPrice: HydratedPrice = new Map()
        for (const [currencyId, amount] of objectEntries(price)) {
            const currency = this.currenciesDb.get(currencyId)
            if (!currency) return err(new ApiError("CurrencyDoesNotExist"))

            hydratedPrice.set(currencyId, { amount, resource: currency })
        }
        return ok(hydratedPrice)
    }

    public resolveProductItem(shopId: NanoId, productId: NanoId) {
        const shop = this.shopsDb.get(shopId)
        if (!shop) return err(new ApiError("ShopDoesNotExist"))

        const productRaw = shop.products[productId]
        if (!productRaw) return err(new ApiError("ProductDoesNotExist"))

        const [error1, item] = this.hydrateItem(productRaw.itemId)
        if (error1) return err(error1)

        return ok({
            ...productRaw,
            item,
        })
    }

    public fullyHydrateProduct(shopId: NanoId, productId: NanoId) {
        const [error1, productWithItem] = this.resolveProductItem(shopId, productId)
        if (error1) return err(error1)
        
        const [error2, productAction] = this.getHydratedProductAction(productWithItem)
        if (error2) return err(error2)

        const [error3, hydratedPrice] = this.getHydratedPrice(productWithItem.price)
        if (error3) return err(error3)

        return ok({
            ...productWithItem,
            action: productAction,
            price: hydratedPrice
        })
    }

    public hydrateShop(shopId: NanoId) {
        const shopRaw = this.shopsDb.get(shopId)
        if (!shopRaw) return err(new ApiError("ShopDoesNotExist"))

        const products: Map<NanoId, Product> = new Map()
        for (const [productId, product] of objectEntries(shopRaw.products)) {
            products.set(productId, product)
        }

        return ok({
            ...shopRaw,
            products
        })
    }

    public fullyHydrateShop(shopId: NanoId) {
        const [error1, shopWithProducts] = this.hydrateShop(shopId)
        if (error1) return err(error1)

        const resolvedProducts: Map<NanoId, AwaitedObjectResultReturn<Hydrator, "resolveProductItem"> & Labelled & Identifiable<NanoId> & Emojiable> = new Map()
        for (const productId of shopWithProducts.products.keys()) {
            const [error, resolvedProduct] = this.resolveProductItem(shopId, productId)
            if (error) return err(error)

            resolvedProducts.set(productId, {...resolvedProduct, name: resolvedProduct.item.name, emoji: resolvedProduct.item.emoji, id: productId})
        }

        return ok({
            ...shopWithProducts,
            products: resolvedProducts
        })
    }


    // if required: maybe inject id inside items and currencies ?
    public getHydratedAccountCurrencies(account: Pick<Account, "currencies">) {
        const currencies: Map<NanoId, Balance<Currency>> = new Map()
        for (const [currencyId, amount] of objectEntries(account.currencies)) {
            const currency = this.currenciesDb.get(currencyId)
            if (!currency) return err(new ApiError("CurrencyDoesNotExist"))
            
            currencies.set(currencyId, { amount, resource: currency })
        }
        return ok(currencies)
    }

    public getHydratedAccountInventory(account: Pick<Account, "inventory">) {
        const inventory: Map<NanoId, Balance<Item>> = new Map()
        for (const [itemId, amount] of objectEntries(account.inventory)) {

            const item = this.itemsDb.get(itemId)
            if (!item) return err(new ApiError("ItemDoesNotExist"))
            
            inventory.set(itemId, { amount, resource: item })
        }
        return ok(inventory)
    }

    public hydrateAccount(id: BrandedSnowflake) {
        const accountRaw = this.accountsDb.get(id)
        if (!accountRaw) return err(new ApiError("AccountDoesNotExist"))

        const [error1, currencies] = this.getHydratedAccountCurrencies(accountRaw)
        if (error1) return err(error1)

        const [error2, inventory] = this.getHydratedAccountInventory(accountRaw)
        if (error2) return err(error2)

        return ok({
            currencies,
            inventory
        }) 
    }
}
