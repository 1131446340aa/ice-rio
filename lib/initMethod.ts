import { Middleware } from 'koa';
import Router from 'koa-router';
import {
  ALL,
  Methods,
  paramType,
  controllerMethodsMap
} from '../util/constants';
import { getParamNames } from '../util/getParamNames';
import { RouterReturnType } from '../util/render';
import { generateLogId } from '../util';
import { Server } from './server';
import { routerFn } from '../util/type';

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
      !controller && controllerMethodsMap.set(_, (controller = new Map()));
      let methods = controller.get(key);
      if (!methods)
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

      //@ts-ignore
      if (!methods!.params[index]) methods!.params[index] = {};
      methods!.params[index].decorateType = p;
      methods!.params[index].name =
        attr === ALL
          ? originParamNames[index]
          : attr || originParamNames[index];
      methods!.params[index].decorateValue = attr;
      if (attr === ALL && methods!.params[index].decorateType === 'Params') {
        throw new Error('The Params do not support ALL');
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
  return ['Post', 'Get', 'Head', 'Put', 'Patch', 'Option', 'Delete'].reduce(
    // @ts-ignore
    (prev, curr: Methods) => {
      prev[curr] = function (
        path?: string,
        config?: { middleWare: Middleware[] }
      ) {
        return method;

        function method(target: any, key: string) {
          /**
           * @description: 路由被代理后的函数
           * @param {array} args
           * @return {*}
           */
          const fn = function (...args: any[]) {
            const [ctx, next] = args;
            ctx.logId = generateLogId();
            Server.initContext(ctx);
            const paramSet =
              controllerMethodsMap.get(target)?.get(key)?.params || [];
            // 使用参数装饰器装饰后的参数
            const finalParams = getFinalParams({ target, key, paramSet, ctx });
            let res = Promise.resolve(
              // 必须实例化，要不然获取不到属性值
              target[key].call(new target.constructor(), ...finalParams)
            ).then(async (r) => {
              r instanceof RouterReturnType
                ? r.type === 'render' && (await ctx.render(r.path, r.config))
                : r !== void 0 && (ctx.body = r)
              next();
            })
            return res;
          };
          let { middleWare, router, routerPath } = processControllerMethod();

          runMiddleWare();
          /**
           * @description: 处理中间件
           * @return {*}
           */
          function runMiddleWare() {
            while (middleWare.length) {
              let curMiddleWare = middleWare.shift();
              router = router[curr.toLowerCase()](routerPath, curMiddleWare!);
            }
            router?.[curr.toLowerCase()](routerPath, fn);
          }

          function processControllerMethod() {
            if (!target['router']) target['router'] = new Router();
            path = path || `/${key}`;
            if (!controllerMethodsMap.get(target))
              controllerMethodsMap.set(target, new Map());
            if (!controllerMethodsMap.get(target)?.get(key))
              controllerMethodsMap.get(target).set(key, {
                //@ts-ignore
                methodDescription: {},
                params: [],
                paramsType: {}
              });

            let map = controllerMethodsMap.get(target)?.get(key);
            let methodDescription = map?.methodDescription || {};
            let params = map.params.filter((i) => i.decorateType === 'Params');
            //@ts-ignore
            methodDescription.path = path;
            // 有问题，如果 get 和 post 等方法使用同一个路由会被覆盖，暂时忽略这种情况
            //@ts-ignore
            methodDescription.method = curr;
            let middleWare = config?.middleWare || [];
            let router = target['router'];
            let routerPath = params.reduce((curr, prev) => {
              //@ts-ignore
              return curr + '/:' + prev['name'];
            }, path);
            return { middleWare, router, routerPath, path };
          }
        }
      };
      return prev;
    },
    {} as Record<Methods, routerFn>
  );

  /**
   * @description: 被装饰器装饰后的参数
   * @param {any} target
   * @param {string} key
   * @param {object} paramSet
   * @param {any} ctx
   * @return {*}
   */
  function getFinalParams({
    target,
    key,
    paramSet,
    ctx
  }: {
    target: any;
    key: string;
    paramSet: {
      isRequired: boolean;
      name: string;
      typeValue: any;
      decorateType: string;
      decorateValue: string;
    }[];
    ctx: any;
  }) {
    return new Array(target[key].OriginLength)
      .fill(1)
      .reduce((prev, curr, index) => {
        const p = paramSet[index];
        const params = ctx.request[p?.decorateType?.toLocaleLowerCase()] || {};
        prev.push(
          p?.name ? (p.decorateValue === ALL ? params : params[p.name]) : ctx
        );
        return prev;
      }, [] as any[]);
  }
}

export const { Post, Get, Head, Put, Patch, Option, Delete } = initMethod();
