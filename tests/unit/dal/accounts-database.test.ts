import { getOrCreateAccount, updateAccount, updateBalance } from "@/features/accounts/database/accounts-database"
import { Account, AccountsDatabase } from "@/features/accounts/database/accounts-type"
import { describe, it, expect, vi, beforeEach } from "vitest"


class MockAccountsDatabase extends AccountsDatabase {
    constructor() {
        // Pass dummy values to the parent constructor
        super({} as any, "");
        this.data = new Map();
    }

    // Override protected + abstract methods
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
                    name: "Cool Currency"
                },
                amount: 10 
            }]
        ]),
        inventory: new Map()
    }
}

describe("getOrCreateAccount", () => {
    it("creates a new account when none exists", async () => {
        const db = new MockAccountsDatabase()
        const [error, account] = await getOrCreateAccount(db, "123")


        expect(error).toBe(null)
        expect(account).toHaveProperty("currencies")
        expect(account.currencies).toBeInstanceOf(Map)
        
        expect(account).toHaveProperty("inventory")
        expect(account.inventory).toBeInstanceOf(Map)

        expect(db.data.has("123")).toBe(true)
    })

    it("returns an existing account without calling save()", async () => {
        const db = new MockAccountsDatabase()
        const existing = getDummyAccount()
        db.data.set("abc", existing)

        const [error, account] = await getOrCreateAccount(db, "abc")

        expect(error).toBe(null)
        expect(account).toStrictEqual(existing)

        expect(db.save).not.toHaveBeenCalled()
    })
})

describe("updating an account", () => {
    it("updateAccount: should update the account", async () => {
        const db = new MockAccountsDatabase()

        db.data.set("abc", getDummyAccount())

        const [error, account] = await updateAccount(db, "abc", { currencies: new Map() })

        expect(error).toBe(null)
        expect(account.currencies.size).toBe(0)
    })

    it("updateBalance: should update the balance", async () => {
        const db = new MockAccountsDatabase()

        db.data.set("abc", getDummyAccount())

        const balance = { 
            item: {
                id: "coolCurrency", 
                name: "Cool Currency"
            },
            amount: 20 
        }

        const [error, account] = await updateBalance(db, "abc", "currencies", "cool_currency", balance)

        expect(error).toBe(null)
        expect(account.currencies.get("cool_currency")).toBeDefined()
        expect(account.currencies.get("cool_currency").amount).toStrictEqual(20)
    })
})

