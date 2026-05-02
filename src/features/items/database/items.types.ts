import z from "zod";
import { itemRawSchema } from "../schemas/items.schemas.js";

export type Item = z.infer<typeof itemRawSchema>
