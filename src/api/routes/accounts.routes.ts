import { Router, Request, Response } from "express";
import { emptyAccount, getAccountsJSON, hasAccount } from "../../database/accounts/accounts-database";
import { handleError } from "../api.error-handler";
import { validJWTNeeded, mustBeOwner } from "../middleware/auth";
import { validateDto } from "../middleware/validate-dto";
import { validateAccount } from "../../database/accounts/accounts.schema";

const router = Router();
const endpoint = "/accounts"


router.get(endpoint, validJWTNeeded, mustBeOwner, (req: Request, res: Response) => {
    const accounts = getAccountsJSON()
    res.json(accounts)
});

router.get(`${endpoint}/:id`, validJWTNeeded, mustBeOwner, (req: Request, res: Response) => {
    const userId = req.params.id

    if (!hasAccount(userId)) {
        res.status(404).json({ message: "User not found" });
        return
    }
    const account = getAccountsJSON()[userId]

    res.json(account)
});

router.post(endpoint, validateDto(validateAccount), validJWTNeeded, mustBeOwner, async (req: Request, res: Response) => {
    return res.status(501).json({ message: "Not implemented" })
});

router.patch(`${endpoint}/:id`, validateDto(validateAccount), validJWTNeeded, mustBeOwner, async (req: Request, res: Response) => {
    const userId = req.params.id

    try {
        res.status(501).json({ message: "Not implemented" })
        
    } 
    catch (error) {
        handleError(error, res)
    }
});

router.delete(`${endpoint}/:id`, validJWTNeeded, mustBeOwner, async (req: Request, res: Response) => {
    const userId = req.params.id

    if (!hasAccount(userId)) {
        res.status(404).json({ message: "User not found" });
        return
    }

    try {
        emptyAccount(userId, "all")
        res.status(204).json({ message: "User removed successfully" });
    } catch (error) {
        handleError(error, res)
    }
});


export default router