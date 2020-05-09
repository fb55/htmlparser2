import MultiplexHandler from "./MultiplexHandler";
import { Handler } from "./Parser";

export class CollectingHandler extends MultiplexHandler {
    _cbs: Partial<Handler>;
    events: [keyof Handler, ...unknown[]][];

    constructor(cbs: Partial<Handler> = {}) {
        super((name, ...args) => {
            this.events.push([name, ...args]);
            (this._cbs[name] as Function)?.(...args);
        });

        this._cbs = cbs;
        this.events = [];
    }

    onreset() {
        this.events = [];
        this._cbs.onreset?.();
    }

    restart() {
        this._cbs.onreset?.();

        for (const [name, ...args] of this.events) {
            (this._cbs[name] as Function)?.(...args);
        }
    }
}
