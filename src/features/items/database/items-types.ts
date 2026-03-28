import { NanoId } from "@/database/database-types.js";
import { Identifiable, Simplify } from "@/lib/types/index.js";
import z from "zod";
import { ItemRawSchema } from "../schemas/items-schemas.js";

export type Item = Simplify<Identifiable<NanoId> & z.infer<typeof ItemRawSchema>>
