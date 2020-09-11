import MultiplexHandler from "./MultiplexHandler";
import { Handler } from "./Parser";

type OptionalFunction = undefined | ((...args: unknown[]) => void);

export class CollectingHandler extends MultiplexHandler {
    _cbs: Partial<Handler>;
    events: [keyof Handler, ...unknown[]][];

    constructor(cbs: Partial<Handler> = {}) {
        super((name, ...args) => {
            this.events.push([name, ...args]);
            (this._cbs[name] as OptionalFunction)?.(...args);
        });

        this._cbs = cbs;
        this.events = [];
    }

    onreset(): void {
        this.events = [];
        this._cbs.onreset?.();
    }

    restart(): void {
        this._cbs.onreset?.();

        for (const [name, ...args] of this.events) {
            (this._cbs[name] as OptionalFunction)?.(...args);
        }
    }
}
