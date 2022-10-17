import { createHook, executionAsyncId } from 'async_hooks';
import Redis from 'ioredis';
import { Context } from 'koa';
// interface IExtendServer {
//   [key: string | symbol | number]:any
// }

// 纯粹为了定义 ts,没任何作用
class ExtendsAttr {
  app: IceServerApp;
  table: IceServerTable;
}
export class Server extends ExtendsAttr {
  private static contexts: Record<number, Context> = {};
  // public extendServer:IExtendServer = {}
  static hooks = createHook({
    // 对象构造时会触发 init 事件。
    init: function (asyncId, type, triggerId) {
      // triggerId 即为当前函数的调用者的 asyncId 。
      if (Server.contexts[triggerId]) {
        // 设置当前函数的异步上下文与调用者的异步上下文一致。
        Server.contexts[asyncId] = Server.contexts[triggerId];
      }
    },
    // 在销毁对象后会触发 destroy 事件。
    destroy: function (asyncId) {
      if (!Server.contexts[asyncId]) return;
      // 销毁当前异步上下文。
      delete Server.contexts[asyncId];
    }
  });
  static initContext(ctx: Context) {
    this.contexts[executionAsyncId()] = ctx;
  }

  get ctx() {
    return Server.contexts[executionAsyncId()];
  }

  get logId(): string {
    return this.ctx['headers']['req-id'] || this.ctx['logId'];
  }
  get headers() {
    return this.ctx['headers'];
  }
  proxyTable() {
    //@ts-ignore
    Server.prototype.table = {};
    //@ts-ignore
    let v = Server.prototype.table;
    //@ts-ignore
    Server.prototype.table = new Proxy(Server.prototype.table, {
      get(target, key) {
        if (String(Server.prototype.ctx?.['headers']?.['stress']) === '1') {
          //@ts-ignore
          return v[key]['stress'];
        }
        //@ts-ignore
        return v[key];
      }
    });
  }
  get rides(): Redis {
    //@ts-ignore
    let r = Server.prototype.__singleRides__;
    if (!r) {
      console.log('please input redisConfig');
    }
    return r;
  }
}
//@ts-ignore
Server.prototype.app = {};
//@ts-ignore
Server.hooks.enable();
Server.prototype.proxyTable();
export interface IceServerApp {
  [key: string]: any;
}

export interface IceServerTable {
  [key: string]: any;
}
