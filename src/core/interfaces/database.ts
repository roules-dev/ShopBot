import { Result } from "@/lib/error-handling.js";
import { DeepReadonly } from "@/lib/types/readonly.js";

export interface Database<
    Id extends string, 
    DataItemRaw extends Record<string, unknown> 
> {
    size(): number
    get(id: Id): DeepReadonly<DataItemRaw> | undefined
    set(id: Id, dataItem: DataItemRaw): Promise<Result<DeepReadonly<DataItemRaw>, Error>>
    patch(id: Id, dataItem: Partial<DataItemRaw>): Promise<Result<DeepReadonly<DataItemRaw>, Error>>
    update(id: Id, fn: (draft: DataItemRaw) => void): Promise<Result<DeepReadonly<DataItemRaw>, Error>>
    delete(id: Id): Promise<Result<boolean, Error>>
    list(): DeepReadonly<Map<Id, DataItemRaw>>
}