
import { viewsOptions } from 'koa-views';
import { RedisOptions } from 'ioredis';
// import { IcePlugin } from '../plugins/basePlugin';

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
  
  // plugins:IcePlugin[];
  redisConfig?: RedisOptions;
  worker?: number;
  env?: 'prod' | 'dev' | 'build';

}

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

export type RioType<T extends U, U  = any> = T;

// controllerMethodsMap
