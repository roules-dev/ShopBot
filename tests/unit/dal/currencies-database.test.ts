import { updateCurrency } from "@/features/currencies/database/currencies-database";
import { CurrenciesDatabase } from "@/features/currencies/database/currencies-types";

import { describe, expect, it, vi } from "vitest";

class MockCurrenciesDatabase extends CurrenciesDatabase {
    constructor() {
        super({}, "");
        this.data = new Map();
    }

    toJSON = vi.fn();
    protected parseRaw = vi.fn().mockReturnValue([null, new Map()]);
    save = vi.fn().mockResolvedValue([null]);
}

describe("currencies db operations", () => {
    it("should update the currency (add emoji)", async () => {
        const db = new MockCurrenciesDatabase()
        db.data.set("coolCurrency", { id: "coolCurrency", name: "Cool Currency", emoji: null})

        const [err, updated] = await updateCurrency(db, "coolCurrency", {emoji: "🪙"})
        
        expect(err).toBe(null)
        if (err) return

        expect(updated).toHaveProperty("emoji")
        expect(updated.emoji).toBe("🪙")
    })

    it("should update the currency (change name)", async () => {
        const db = new MockCurrenciesDatabase()
        db.data.set("coolCurrency", { id: "coolCurrency", name: "Cool Currency", emoji: "🪙"})

        const [err, updated] = await updateCurrency(db, "coolCurrency", {name: "Not that cool currency"})
        
        expect(err).toBe(null)
        if (err) return

        expect(updated.name).toBe("Not that cool currency")
    })
})