import { Router, Request, Response } from "express";
import { validateDto } from "../middleware/validate-dto";
import { handleError } from "../api.error-handler";
import { validJWTNeeded, mustBeOwner } from "../middleware/auth";
import { getCurrenciesJSON, getCurrencies, createCurrency, updateCurrency, removeCurrency } from "../../database/currencies/currencies-database";
import { CurrencyOptionsOptional } from "../../database/currencies/currencies-types";
import { validateCurrency, validateCurrencyOptional } from "../../database/currencies/currencies.schemas";


const router = Router();
const endpoint = "/currencies"


router.get(endpoint, (req: Request, res: Response) => {
    const currencies = getCurrenciesJSON()
    res.json(currencies)
});

router.get(`${endpoint}/:id`, (req: Request, res: Response) => {
    const currencyId = req.params.id

    if (!getCurrencies().has(currencyId)) {
        res.status(404).json({ message: "Currency not found" });
        return
    }
    const currency = getCurrenciesJSON()[currencyId]

    res.json(currency)
});

router.post(endpoint, validateDto(validateCurrency), validJWTNeeded, mustBeOwner, async (req: Request, res: Response) => {
    try {
        const newCurrency = await createCurrency(req.body.name, req.body.emoji)

        res.status(201).json(getCurrenciesJSON()[newCurrency.id]);
    } 
    catch (error) {
        handleError(error, res)
    }

});

router.patch(`${endpoint}/:id`, validateDto(validateCurrencyOptional), validJWTNeeded, mustBeOwner, async (req: Request, res: Response) => {
    const currencyId = req.params.id

    try {
        const currenciesOption = req.body as CurrencyOptionsOptional
        
        await updateCurrency(currencyId, currenciesOption)
    } 
    catch (error) {
        handleError(error, res)
    }
});

router.delete(`${endpoint}/:id`, validJWTNeeded, mustBeOwner, async (req: Request, res: Response) => {
    const currencyId = req.params.id

    try {
        await removeCurrency(currencyId)

        res.status(204).json({ message: "Currency removed successfully" });
    } catch (error) {
        handleError(error, res)
    }
});

export default router;