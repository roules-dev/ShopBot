import { NanoId } from "@/database/database-types.js";
import { Identifiable, Prettify } from "@/lib/types/utils.js";
import z from "zod";
import { ItemRawSchema } from "../schemas/items-schemas.js";

export type Item = Prettify<Identifiable<NanoId> & z.infer<typeof ItemRawSchema>>
