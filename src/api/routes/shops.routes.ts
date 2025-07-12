import { Router, Request, Response } from "express";
import { getShops, getShopsJSON, removeShop } from "../../database/shops/shops-database";
import { validateShop, validateShopOptional } from "../../database/shops/shops.schema";
import { validJWTNeeded, mustBeOwner } from "../middleware/auth";
import { validateDto } from "../middleware/validate-dto";
import { handleError } from "../api.error-handler";

const router = Router();
const endpoint = "/shops"



router.get(endpoint, (req: Request, res: Response) => {
    const shops = getShopsJSON()
    res.json(shops)
});

router.get(`${endpoint}/:id`, (req: Request, res: Response) => {
    const shopId = req.params.id

    if (!getShops().has(shopId)) {
        res.status(404).json({ message: "Shop not found" });
        return
    }
    const account = getShopsJSON()[shopId]

    res.json(account)
});

router.post(endpoint, validateDto(validateShop), validJWTNeeded, mustBeOwner, async (req: Request, res: Response) => {
    return res.status(501).json({ message: "Not implemented" })
});

router.patch(`${endpoint}/:id`, validateDto(validateShopOptional), validJWTNeeded, mustBeOwner, async (req: Request, res: Response) => {
    const shopId = req.params.id

    try {
        res.status(501).json({ message: "Not implemented" })
        
    } 
    catch (error) {
        handleError(error, res)
    }
});

router.delete(`${endpoint}/:id`, validJWTNeeded, mustBeOwner, async (req: Request, res: Response) => {
    const shopId = req.params.id

    if (!getShops().has(shopId)) {
        res.status(404).json({ message: "Shop not found" });
        return
    }

    try {
        removeShop(shopId)
        
        res.status(204).json({ message: "Shop removed successfully" });
    } catch (error) {
        handleError(error, res)
    }
});


export default router