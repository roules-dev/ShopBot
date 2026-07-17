import { AccountsDatabase } from "@/core/database/database.types";
import { NanoId } from "@/database/database.types";
import { JsonDatabase } from "@/database/json-database";
import { dbGetOrCreateAccount, dbUpdateAccount, dbUpdateBalance } from "@/features/accounts/database/accounts.database";
import { Account } from "@/features/accounts/database/accounts.type";
import { accountRawSchema } from "@/features/accounts/schemas/accounts.schemas";
import { snowflakeSchema, BrandedSnowflake } from "@/schemas/utils";
import { vi, it, expect, describe } from "vitest";



    
class MockAccountsDatabase extends JsonDatabase<typeof snowflakeSchema, typeof accountRawSchema> implements AccountsDatabase {

    constructor() {
        super({}, "", accountRawSchema, snowflakeSchema);
        this.data = new Map();
    }

    protected toJSON = vi.fn();
    protected parseRaw = vi.fn().mockReturnValue([null, new Map()]);
    protected save = vi.fn().mockResolvedValue([null]);
}

function getDummyAccount(): Account {
    return {
        currencies: {["coolCurrency" as NanoId]: 10},
        inventory: {},
    }
}

describe("getOrCreateAccount", () => {
    it("creates a new account when none exists", async () => {
        const db = new MockAccountsDatabase()

        const id = "123" as BrandedSnowflake

        const [error, account] = await dbGetOrCreateAccount(db, id)


        expect(error).toBe(null)
        expect(account).not.toBe(null)
        if (error) return

        expect(account).toHaveProperty("currencies")
        expect(account).toHaveProperty("inventory")

        expect(db.get(id)).not.toBe(undefined)
    })

    it("returns an existing account", async () => {
        const db = new MockAccountsDatabase()
        const existing = getDummyAccount()

        const id = "abc" as BrandedSnowflake
        db.set(id, existing)

        const [error, account] = await dbGetOrCreateAccount(db, id)

        expect(error).toBe(null)
        expect(account).toStrictEqual(existing)
    })
})

describe("updating an account", () => {
    it("updateAccount: should update the account", async () => {
        const db = new MockAccountsDatabase()

        const id = "abc" as BrandedSnowflake

        db.set(id, getDummyAccount())

        const [error, account] = await dbUpdateAccount(db, id, { currencies: {} })

        expect(error).toBe(null)
        if (error) return
        expect(account.currencies).toStrictEqual({})
    })

    it("updateBalance: should update the balance", async () => {
        const db = new MockAccountsDatabase()
        const id = "abc" as BrandedSnowflake
        db.set(id, getDummyAccount())

        const currencyId = "coolCurrency" as NanoId

        const [error, account] = await dbUpdateBalance(db, id, "currencies", currencyId, 20)

        expect(error).toBe(null)
        if (error) return

        expect(account.currencies[currencyId]).toStrictEqual(20)
    })
})

