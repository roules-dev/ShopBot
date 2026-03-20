import z from "zod";
import { ItemRawSchema } from "../schemas/items-schemas.js";
import { Identifiable, Prettify } from "@/utils/types.js";
import { NanoId } from "@/database/database-types.js";

export type Item = Prettify<Identifiable<NanoId> & z.infer<typeof ItemRawSchema>>
