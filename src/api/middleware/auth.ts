import { Request, Response, NextFunction } from "express";
import jwt, { Jwt } from "jsonwebtoken";
import config from "../../../config/config.json";

export function validJWTNeeded(req: Request, res: Response, next: NextFunction) {
    if (!req.headers['authorization']) {
        res.status(401).send()
        return 
    }

    try {
        const authorization = req.headers['authorization'].split(' ');

        if (authorization[0] !== 'Bearer') {
            res.status(401).send()
            return 
        } 
        
        res.locals.jwt = jwt.verify(authorization[1], config.jwtSecret) as Jwt

        next()
        return
    } 
    catch (err) {
        res.status(403).send()
        return 
    }
    
}

export function mustBeOwner(req: Request, res: Response, next: NextFunction) {
    if (res.locals.jwt.userId !== config.ownerId) {
        res.status(403).send();
        return 
    }
    next()
}