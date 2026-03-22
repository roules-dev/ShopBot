import { describe, it, expect, vi, beforeEach } from "vitest"

let AccountsDatabase: any
let getOrCreateAccount: any
let updateAccount: any
let updateBalance: any

beforeEach(async () => {
    vi.resetModules()

    vi.doMock("@/features/accounts/database/accounts-type.js", () => {
        return {
            AccountsDatabase: vi.fn().mockImplementation(function () {
                this.data = new Map()
                this.save = vi.fn().mockResolvedValue([null])
            })
        }
    })

    AccountsDatabase = (await import("@/features/accounts/database/accounts-type.js")).AccountsDatabase
    getOrCreateAccount = (await import("@/features/accounts/database/accounts-database.js")).getOrCreateAccount
    updateAccount = (await import("@/features/accounts/database/accounts-database.js")).updateAccount
    updateBalance = (await import("@/features/accounts/database/accounts-database.js")).updateBalance
})

describe("getOrCreateAccount", () => {
    it("creates a new account when none exists", async () => {
        const [error, account] = await getOrCreateAccount("123")

        const instance = AccountsDatabase.mock.results[0].value

        expect(error).toBe(null)
        expect(account).toHaveProperty("currencies")
        expect(account.currencies).toBeInstanceOf(Map)
        
        expect(account).toHaveProperty("inventory")
        expect(account.inventory).toBeInstanceOf(Map)

        expect(instance.data.has("123")).toBe(true)
    })

    it("returns an existing account without calling save()", async () => {
        const instance = AccountsDatabase.mock.results[0].value

        const existing = { currencies: new Map([["cool_currency", { amount: 10 }]]), inventory: new Map() }
        await instance.data.set("abc", existing)

        console.log(instance.data)

        const [error, account] = await getOrCreateAccount("abc")

        expect(error).toBe(null)
        expect(account).toStrictEqual(existing)

        expect(instance.save).not.toHaveBeenCalled()
    })
})

describe("updating an account", () => {
    it("updateAccount: should update the account", async () => {
        const instance = AccountsDatabase.mock.results[0].value

        const existing = { currencies: new Map([["cool_currency", { amount: 10 }]]), inventory: new Map() }
        await instance.data.set("abc", existing)

        const [error, account] = await updateAccount("abc", { currencies: new Map([["cool_currency", { amount: 20 }]]) })

        expect(error).toBe(null)
        expect(account.currencies.get("cool_currency")).toStrictEqual({ amount: 20 })
    })

    it("updateBalance: should update the balance", async () => {
        const instance = AccountsDatabase.mock.results[0].value

        const existing = { currencies: new Map([["cool_currency", { amount: 10 }]]), inventory: new Map() }
        await instance.data.set("abc", existing)

        const [error, account] = await updateBalance("abc", "currencies", "cool_currency", { amount: 20 })

        expect(error).toBe(null)
        expect(account.currencies.get("cool_currency")).toBeDefined()
        expect(account.currencies.get("cool_currency").amount).toStrictEqual(20)
    })
})

