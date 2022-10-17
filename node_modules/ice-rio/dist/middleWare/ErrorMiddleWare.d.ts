import { Context, Next } from 'koa';
export declare function ErrorMiddleware(): (ctx: Context, next: Next) => Promise<void>;
