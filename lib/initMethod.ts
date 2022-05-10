import { Middleware } from 'koa';
import Router from 'koa-router';
import {
  All,
  Methods,
  paramType,
  routerFn,
  controllerMethodsParamsIdxMap,
  controllerMethodsApiDocMap
} from '../util/constants';
import { getParamNames } from '../util/getParamNames';
import { getControllerResult } from '../util/getControllerResult';
const controllerMap = new WeakMap();

/**
 * @description: 创建参数装饰器的高阶函数
 * @param {*} p
 * @return {*}
 */
function createParamMapping(p: paramType) {
  return (attr?: string | typeof All): ParameterDecorator =>
    function (_, key, index) {
      let { result: paramSet } = getControllerResult(controllerMap, _, key, []);
      //@ts-ignore
      const originParamNames = getParamNames(_[key]);
      paramSet[index] = new createRouteParam(
        p,
        attr || originParamNames[index]
      );
      let { result: paramsIdxSet } = getControllerResult(
        controllerMethodsParamsIdxMap,
        _,
        key,
        []
      );
      let { result: apiDocMethodParams } = getControllerResult(
        controllerMethodsApiDocMap,
        _,
        key,
        {}
      );
      paramsIdxSet![index] = originParamNames[index];
      apiDocMethodParams.routerName = key;
      return _;
    };
}
export const Query = createParamMapping('Query');
export const Body = createParamMapping('Body');
export const Params = createParamMapping('Params');
/**
 * @description: 迭代生成 post、get 等方法装饰器
 * @param {*}
 * @return {*}
 */
function initMethod(): Record<Methods, routerFn> {
   // @ts-ignore
  return ['post', 'get', 'head', 'put', 'patch', 'options'].reduce(
     // @ts-ignore
    (prev, curr: Methods) => {
      prev[curr] = function (
        path?: string,
        config?: { middleWare: Middleware[] }
      ) {
        return function (
          target: any,
          key: string,
          descriptor: PropertyDescriptor
        ) {
          if (!target['router']) target['router'] = new Router();
          path = path || `/${key}`;
          let { result: apiDocMethodParams } = getControllerResult(
            controllerMethodsApiDocMap,
            target,
            key,
            {}
          );
          apiDocMethodParams.path = path;
          // 有问题，如果 get 和 post 等方法使用同一个路由会被覆盖，暂时忽略这种情况
          apiDocMethodParams.method = curr;
          const fn = function (...args: any[]) {
            const [ctx, next] = args;
            const paramSet = controllerMap.get(target)?.get(key) || [];
            // 使用参数装饰器装饰后的参数
            const finalParams = new Array(target[key].OriginLength)
              .fill(1)
              .reduce((prev, curr, index) => {
                const p = paramSet[index];
                const params = ctx.request[p?.type?.toLocaleLowerCase()] || {};
                prev.push(
                  p?.value ? (p.value === All ? params : params[p.value]) : ctx
                );
                return prev;
              }, [] as any[]);
            let res = Promise.resolve(
              target[key].call(target, ...finalParams)
            ).then((r) => {
              ctx.body = r;
              next();
            });
            return res;
          };

          let middleWare = config?.middleWare || [];
          let router = target['router'];
          function runMiddleWare() {
            while (middleWare.length) {
              let cur = middleWare.shift();
              router = router[curr](path!, cur!);
            }
            router?.[curr](path!, fn);
          }
          runMiddleWare();
        };
      };
      return prev;
    },
    {} as Record<Methods, routerFn>
  );
}

export const { post, get, head, put, patch, options } = initMethod();

class createRouteParam {
  constructor(public type: paramType, public value: string | typeof All) {}
}
