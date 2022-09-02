import awaitToJs from 'await-to-js';
import { Context, Next } from 'koa';
import { ErrorCode } from '../util/enum';
export function ErrorMiddleware() {
  return async (ctx: Context, next: Next) => {
    const [error] = await awaitToJs(next());
    if (error) {
      //@ts-ignore
      ctx.status = error.status || ErrorCode.ServiceError;
      ctx.message = error.message;
    }
  };
}
