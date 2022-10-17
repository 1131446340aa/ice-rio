"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const async_hooks_1 = require("async_hooks");
class ExtendsAttr {
}
class Server extends ExtendsAttr {
    static initContext(ctx) {
        this.contexts[(0, async_hooks_1.executionAsyncId)()] = ctx;
    }
    get ctx() {
        return Server.contexts[(0, async_hooks_1.executionAsyncId)()];
    }
    get logId() {
        return this.ctx['headers']['req-id'] || this.ctx['logId'];
    }
    get headers() {
        return this.ctx['headers'];
    }
    proxyTable() {
        Server.prototype.table = {};
        let v = Server.prototype.table;
        Server.prototype.table = new Proxy(Server.prototype.table, {
            get(target, key) {
                var _a, _b;
                if (String((_b = (_a = Server.prototype.ctx) === null || _a === void 0 ? void 0 : _a['headers']) === null || _b === void 0 ? void 0 : _b['stress']) === '1') {
                    return v[key]['stress'];
                }
                return v[key];
            }
        });
    }
    get rides() {
        let r = Server.prototype.__singleRides__;
        if (!r) {
            console.log('please input redisConfig');
        }
        return r;
    }
}
exports.Server = Server;
Server.contexts = {};
Server.hooks = (0, async_hooks_1.createHook)({
    init: function (asyncId, type, triggerId) {
        if (Server.contexts[triggerId]) {
            Server.contexts[asyncId] = Server.contexts[triggerId];
        }
    },
    destroy: function (asyncId) {
        if (!Server.contexts[asyncId])
            return;
        delete Server.contexts[asyncId];
    }
});
Server.prototype.app = {};
Server.hooks.enable();
Server.prototype.proxyTable();
