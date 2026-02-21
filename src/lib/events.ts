export class EventBus<Events extends Record<string, unknown[]>> {
    
    private events: {
        [K in keyof Events]?: Array<(...args: Events[K]) => void>
    } = {}

    public on<K extends keyof Events>(event: K, callback: (...args: Events[K]) => void) {
        this.events[event] ??= []
        this.events[event].push(callback)
    }

    public emit<K extends keyof Events>(event: K, ...args: Events[K]) {
        this.events[event]?.forEach(callback => callback(...args))
    }
}