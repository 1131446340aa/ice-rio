import { Middleware } from 'koa';

export const All = Symbol('all');
export type paramType = 'Params' | 'Query' | 'Body';

export type Methods = 'post' | 'get' | 'head' | 'put' | 'patch' | 'options';

export type routerFn = (
  path?: string,
  config?: {
    middleWare: Middleware[];
  }
) => any;

export const typeMap: WeakMap<Object, Map<string | symbol, Record<string,string>>> =
  new WeakMap();
export const importedControllerMap: WeakMap<Object, Record<string, string>> =
  new WeakMap();

export const controllerMethodsParamsIdxMap: WeakMap<
  Object,
  Map<string | symbol, string[]>
> = new WeakMap();

export const controllerMethodsReturnMap: WeakMap<
  Object,
  Map<string | symbol, any>
> = new WeakMap();

export const controllerMethodsDescriptionMap: WeakMap<
  Object,
  Map<string | symbol, string>
> = new WeakMap();

export const controllerMethodsApiDocMap: WeakMap<
  Object,
  Map<string | symbol, IGenerateApiDoc>
> = new WeakMap();

export interface IGenerateApiDoc {
  method: string;
  controller: string;
  path: string;
  routerName: string;
  descpritition: string;
  fileName: string;
  params: any[];
  returns: any;
}

export interface ILoad {
  dir: string;
  initDb?: boolean;
  apiDoc?: boolean;
  apiDocDir?: string;
  dbConfig?: {
    port: number;
    host: string;
    database: string;
    username: string;
    password: string;
    dialect: string;
  };
  env?:'prod' | 'dev' | 'build'
}
