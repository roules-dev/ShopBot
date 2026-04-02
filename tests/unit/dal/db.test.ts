import { getOrCreateAccount, updateAccount, updateBalance } from "@/features/accounts/database/accounts-database";
import { Account, AccountsDatabase } from "@/features/accounts/database/accounts-type";
import { describe, expect, it, vi } from "vitest";

    
class MockAccountsDatabase extends AccountsDatabase {
    constructor() {
        super({}, "");
        this.data = new Map();
    }

    toJSON = vi.fn();
    protected parseRaw = vi.fn().mockReturnValue([null, new Map()]);
    save = vi.fn().mockResolvedValue([null]);
}

function getDummyAccount(): Account {
    return {
        currencies: new Map([
            ["coolCurrency", { 
                item: {
                    id: "coolCurrency", 
                    emoji: "🪙",
                    name: "Cool Currency"
                },
                amount: 10 
            }]
        ]),
        inventory: new Map()
    }
}

describe("database class (with accounts)", () => {
    it("should set and get an item", async () => {
        const db = new MockAccountsDatabase()
        const account = getDummyAccount()
        await db.set("123", account)
        expect(db.get("123")).toStrictEqual(account)
    })
    
    it("should patch an item", async () => {
        const db = new MockAccountsDatabase()
        const account = getDummyAccount()

        db.data.set("123", account)
        await db.patch("123", { currencies: new Map()})

        expect(db.get("123")).toStrictEqual({ currencies: new Map(), inventory: new Map()})

    })

})