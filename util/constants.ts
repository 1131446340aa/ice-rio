import { Middleware } from 'koa';
import { viewsOptions } from 'koa-views';
import { RedisOptions } from 'ioredis';

export const ALL = '__All__';
export type paramType =
  | 'Params'
  | 'Query'
  | 'Body'
  | 'Cookie'
  | 'Session'
  | 'Headers';

export type Methods =
  | 'Post'
  | 'Get'
  | 'Head'
  | 'Put'
  | 'Patch'
  | 'Option'
  | 'Delete';

export type routerFn = (
  path?: string,
  config?: {
    middleWare: Middleware[];
  }
) => any;


export interface IGenerateApiDoc {
  method: string;
  controller: string;
  path: string;
  routerName: string | symbol;
  description: string;
  fileName: string;
  params: any[];
  returns: any;
}

export interface ILoad {
  appDir?: string;
  initDb?: boolean;
  enableApiDoc?: boolean;
  apiDocDir?: string;
  enableViews?: boolean;
  viewsConfig?: typeof viewsOptions;
  dbConfig?: {
    port: number;
    host: string;
    database: string;
    username: string;
    password: string;
    dialect: string;
    is_stress?: boolean;
  };
  redisConfig?: RedisOptions;
  worker?: number;
  env?: 'prod' | 'dev' | 'build';
}

// export const server = new Server();

export const controllerMethodsMap: WeakMap<
  Object,
  Map<
    string | symbol,
    {
      returnType: {};
      methodDescription: {
        controller: string;
        fileName: string;
        params: [];
        returns: {};
        description: string;
        routerName: string | symbol;
        path: string;
        method: string;
      };
      params: {
        isRequired: boolean;
        name: string;
        // value: any;
        typeValue: any;
        decorateType: string;
        decorateValue: string;
      }[];
      paramsType: {};
    }
  >
> = new WeakMap();

export type RioType<T, U = any> = T;

// controllerMethodsMap
