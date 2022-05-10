import 'reflect-metadata';

export const CONTROLLER_KEY = Symbol('ioc:controller_key');

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
