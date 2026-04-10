import z from "zod";
import { ItemRawSchema } from "../schemas/items-schemas.js";

export type Item = z.infer<typeof ItemRawSchema>
