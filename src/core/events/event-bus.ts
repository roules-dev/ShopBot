import { Setting } from "@/features/settings/database/settings-types.js"
import { EventBus } from "@/lib/events.js"
import { DeepReadonly } from "@/lib/types/readonly.js"


export const EVENTS = new EventBus<{
    settingUpdated: [settingId: string, setting: DeepReadonly<Setting>],
}>()