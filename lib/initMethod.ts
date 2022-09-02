import { Middleware } from 'koa';
import Router from 'koa-router';
import {
  ALL,
  Methods,
  paramType,
  routerFn,
  controllerMethodsMap
} from '../util/constants';
import { getParamNames } from '../util/getParamNames';
import { RouterReturnType } from '../util/render';
import { generateLogId } from '../util';
import { Server } from './server';

/**
 * @description: 创建参数装饰器的高阶函数
 * @param {*} p
 * @return {*}
 */
function createParamMapping(p: paramType) {
  return (attr?: string): ParameterDecorator =>
    function (_, key, index) {
      //@ts-ignore
      const originParamNames = getParamNames(_[key]);
      let controller = controllerMethodsMap.get(_);
      if (!controller) {
        controllerMethodsMap.set(_, (controller = new Map()));
      }
      let methods = controller.get(key);
      if (!methods) {
        //@ts-ignore
        controller.set(
          key,
          (methods = {
            params: [],
            paramsType: {},
            //@ts-ignore
            methodDescription: {
              //@ts-ignore
              description: `please input @description of ${_.constructor.name}.${key}`
            }
          })
        );
      }
      //@ts-ignore
      if (!methods!.params[index]) methods!.params[index] = {};
      methods!.params[index].decorateType = p;
      methods!.params[index].name = attr === ALL ? originParamNames[index] : (attr ||  originParamNames[index]);
      methods!.params[index].decorateValue = attr
      if(attr === ALL && methods!.params[index].decorateType === 'Params'){
        throw new Error('The Params do not support ALL')
      }
      methods!['methodDescription'].routerName = key;
      return _;
    };
}
export const Query = createParamMapping('Query');
export const Body = createParamMapping('Body');
export const Params = createParamMapping('Params');
export const Cookie = createParamMapping('Cookie');
export const Session = createParamMapping('Session');
export const Headers = createParamMapping('Headers');
/**
 * @description: 迭代生成 post、get 等方法装饰器
 * @param {*}
 * @return {*}
 */
function initMethod(): Record<Methods, routerFn> {
  // @ts-ignore
  return ['Post', 'Get', 'Head', 'Put', 'Patch', 'Option','Delete'].reduce(
    // @ts-ignore
    (prev, curr: Methods) => {
      prev[curr] = function (
        path?: string,
        config?: { middleWare: Middleware[] }
      ) {
        return function (target: any, key: string) {
          if (!target['router']) target['router'] = new Router();
          path = path || `/${key}`;
          if (!controllerMethodsMap.get(target)) {
            controllerMethodsMap.set(target, new Map());
          }
          if (!controllerMethodsMap.get(target)?.get(key)) {
            controllerMethodsMap
              .get(target)
              //@ts-ignore
              .set(key, { methodDescription: {}, params: [], paramsType: {} });
          }
          let map = controllerMethodsMap.get(target)?.get(key);
          let methodDescription = map?.methodDescription || {};
          let params = map.params.filter((i) => i.decorateType === 'Params');
          //@ts-ignore
          methodDescription.path = path;
          // 有问题，如果 get 和 post 等方法使用同一个路由会被覆盖，暂时忽略这种情况
          //@ts-ignore
          methodDescription.method = curr;
          const fn = function (...args: any[]) {
            const [ctx, next] = args;
            ctx.logId = generateLogId();
            Server.initContext(ctx);
            const paramSet =
              controllerMethodsMap.get(target)?.get(key)?.params || [];
            // 使用参数装饰器装饰后的参数
            const finalParams = new Array(target[key].OriginLength)
              .fill(1)
              .reduce((prev, curr, index) => {
                const p = paramSet[index];
                const params =
                  ctx.request[p?.decorateType?.toLocaleLowerCase()] || {};
                prev.push(
                  p?.name ? (p.decorateValue === ALL ? params : params[p.name]) : ctx
                );
                return prev;
              }, [] as any[]);
            let res = Promise.resolve(
              target[key].call(target, ...finalParams)
            ).then(async (r) => {
              if (r instanceof RouterReturnType) {
                if (r.type === 'render') {
                  await ctx.render(r.path, r.config);
                }
              } else {
                r && (ctx.body = r);
              }
              next();
            });
            return res;
          };

          let middleWare = config?.middleWare || [];
          let router = target['router'];
          let p = params.reduce((curr, prev) => {
            //@ts-ignore
            return curr + '/:' + prev['name'];
          }, path);
          function runMiddleWare() {
            while (middleWare.length) {
              let cur = middleWare.shift();
              router = router[curr.toLowerCase()](p, cur!);
            }
            router?.[curr.toLowerCase()](p, fn);
          }
          runMiddleWare();
        };
      };
      return prev;
    },
    {} as Record<Methods, routerFn>
  );
}

export const { Post, Get, Head, Put, Patch, Option, Delete } = initMethod();
 
// class createRouteParam {
//   constructor(public type: paramType, public value: string | typeof All) {}
// }
