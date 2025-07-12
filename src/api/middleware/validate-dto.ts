import { ValidateFunction } from 'ajv';
import { Request, Response, NextFunction } from 'express';
import { ajv } from './ajv-instance';

export function validateDto(ajvValidate: ValidateFunction) {
    return (req: Request, res: Response, next: NextFunction) => {
        const valid = ajvValidate(req.body);

        if (!valid) {
            const errors = ajvValidate.errors

            res.status(400).json({ errors });
            return
        }
        next()
    }
}

const idSchema = {
    type: 'string',
    format: 'id'
}
export const validateId = ajv.compile(idSchema)


