import { Response } from "express";
import { DatabaseError } from "../database/database-types";

export function handleError(error: unknown, res: Response) {
    if (error instanceof DatabaseError) {
        const { status, message } = error
        
        res.status(status).json({ message });
        return
    }
    res.status(400).json({ message: "Error removing currency" });
}