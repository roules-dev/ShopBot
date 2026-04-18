import { AccountsDatabase } from "@/core/database/database.types";
import { NanoId } from "@/database/database-types";
import { JsonDatabase } from "@/database/json-database";
import { Account } from "@/features/accounts/database/accounts-type";
import { AccountRawSchema } from "@/features/accounts/schemas/accounts-schemas";
import { BrandedSnowflake, SnowflakeSchema } from "@/schemas/utils";
import { describe, expect, it, vi } from "vitest";

    
class MockAccountsDatabase extends JsonDatabase<typeof SnowflakeSchema, typeof AccountRawSchema> implements AccountsDatabase {

    constructor() {
        super({}, "", AccountRawSchema, SnowflakeSchema);
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

describe("database class (with accounts)", () => {
    const id = "123" as BrandedSnowflake
    
    it("should set and get an item", async () => {
        const db = new MockAccountsDatabase()
        const account = getDummyAccount()
        await db.set(id, account)
        expect(db.get(id)).toStrictEqual(account)
    })
    
    it("should patch an item", async () => {
        const db = new MockAccountsDatabase()
        const account = getDummyAccount()

        db.set(id, account)
        await db.patch(id, { currencies: {}})

        expect(db.get(id)).toStrictEqual({ currencies: {}, inventory: {}})

    })

    it("should delete an item", async () => {
        const db = new MockAccountsDatabase()
        const account = getDummyAccount()

        db.set(id, account)
        await db.delete(id)

        expect(db.get(id)).toBeUndefined()
    })

})