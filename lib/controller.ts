import 'reflect-metadata';

export const CONTROLLER_KEY = Symbol('ioc:controller_key');

/**
 * @description: 增加路由前缀
 * @param {string} path
 * @param {array} args
 * @return {*}
 */
export function controller(path: string, ...args: any[]) {
  return function (target: any) {
    Reflect.defineMetadata(
      CONTROLLER_KEY,
      {
        path,
        args: args || []
      },
      target
    );
  };
}
