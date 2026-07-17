import { CurrenciesDatabase } from "@/core/database/database.types";
import { NanoId } from "@/database/database.types";
import { JsonDatabase } from "@/database/json-database";
import { dbUpdateCurrency } from "@/features/currencies/database/currencies.database";
import { currencyRawSchema } from "@/features/currencies/schemas/currencies.schemas";
import { nanoIdSchema, BrandedEmoji } from "@/schemas/utils";
import { vi, it, expect, describe } from "vitest"

class MockCurrenciesDatabase extends JsonDatabase<typeof nanoIdSchema, typeof currencyRawSchema> implements CurrenciesDatabase {
    constructor() {
        super({}, "", currencyRawSchema, nanoIdSchema);
        this.data = new Map();
    }

    toJSON = vi.fn();
    parseRaw = vi.fn().mockReturnValue([null, new Map()]);
    save = vi.fn().mockResolvedValue([null]);
}

describe("currencies db operations", () => {
    const currencyId = "coolCurrency" as NanoId

    it("should update the currency (add emoji)", async () => {
        const db = new MockCurrenciesDatabase()
        
        db.set(currencyId, {name: "Cool Currency", emoji: null, refCount: 0})

        const [err, updated] = await dbUpdateCurrency(db, currencyId, {emoji: "🪙" as BrandedEmoji})
        
        expect(err).toBe(null)
        if (err) return

        expect(updated).toHaveProperty("emoji")
        expect(updated.emoji).toBe("🪙")
    })

    it("should update the currency (change name)", async () => {
        const db = new MockCurrenciesDatabase()
        db.set(currencyId, { name: "Cool Currency", emoji: "🪙" as BrandedEmoji, refCount: 0})

        const [err, updated] = await dbUpdateCurrency(db, currencyId, {name: "Not that cool currency"})
        
        expect(err).toBe(null)
        if (err) return

        expect(updated.name).toBe("Not that cool currency")
    })
})