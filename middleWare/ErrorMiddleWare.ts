import awaitToJs from 'await-to-js';
import { Context, Next } from 'koa';
import { ErrorCode } from '../util/type';
export function ErrorMiddleware() {
  return async (ctx: Context, next: Next) => {
    const [error] = await awaitToJs(next());
    if (error) {
      console.log(error.message);
      //@ts-ignore
      ctx.status = error.status || ErrorCode.ServiceError;
      ctx.message = error.message;
    }
  };
}
