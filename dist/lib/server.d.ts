/// <reference types="node" />
/// <reference types="node" />
import Redis from 'ioredis';
import { Context } from 'koa';
declare class ExtendsAttr {
    app: IceServerApp;
    table: IceServerTable;
}
export declare class Server extends ExtendsAttr {
    private static contexts;
    static hooks: import("async_hooks").AsyncHook;
    static initContext(ctx: Context): void;
    get ctx(): Context;
    get logId(): string;
    get headers(): import("http").IncomingHttpHeaders;
    proxyTable(): void;
    get rides(): Redis;
}
export interface IceServerApp {
    [key: string]: any;
}
export interface IceServerTable {
    [key: string]: any;
}
export {};
