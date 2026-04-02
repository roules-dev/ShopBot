import { Result } from "@/lib/error-handling.js";
import { DeepReadonly } from "@/lib/types/readonly.js";

export interface Database<
    Id extends string, 
    DataItemRaw extends object,  
> {
    size(): number
    get(id: Id): DeepReadonly<DataItemRaw> | undefined
    set(id: Id, dataItem: DataItemRaw): Promise<Result<DeepReadonly<DataItemRaw>, Error>>
    patch(id: Id, dataItem: Partial<DataItemRaw>): Promise<Result<DeepReadonly<DataItemRaw>, Error>>
    delete(id: Id): Promise<Result<boolean, Error>>
    list(): DeepReadonly<Map<Id, DataItemRaw>>
}
// upsert ?
// need a method that can update a map inside a data item
