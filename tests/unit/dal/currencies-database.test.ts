

import { CurrenciesDatabase } from "@/core/database/database.types";
import { updateCurrency } from "@/core/services/currencies/currencies.services";
import { NanoId } from "@/database/database-types";
import { JsonDatabase } from "@/database/json-database";
import { dbUpdateCurrency } from "@/features/currencies/database/currencies-database";
import { CurrencyRawSchema } from "@/features/currencies/schemas/currencies-schemas";
import { BrandedEmoji, NanoIdSchema } from "@/schemas/utils";
import { describe, expect, it, vi } from "vitest";

class MockCurrenciesDatabase extends JsonDatabase<typeof NanoIdSchema, typeof CurrencyRawSchema> implements CurrenciesDatabase {
    constructor() {
        super({}, "", CurrencyRawSchema, NanoIdSchema);
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
        
        db.set(currencyId, {name: "Cool Currency", emoji: null})

        const [err, updated] = await dbUpdateCurrency(db, currencyId, {emoji: "🪙" as BrandedEmoji})
        
        expect(err).toBe(null)
        if (err) return

        expect(updated).toHaveProperty("emoji")
        expect(updated.emoji).toBe("🪙")
    })

    it("should update the currency (change name)", async () => {
        const db = new MockCurrenciesDatabase()
        db.set(currencyId, { name: "Cool Currency", emoji: "🪙" as BrandedEmoji})

        const [err, updated] = await dbUpdateCurrency(db, currencyId, {name: "Not that cool currency"})
        
        expect(err).toBe(null)
        if (err) return

        expect(updated.name).toBe("Not that cool currency")
    })
})