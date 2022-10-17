import { viewsOptions } from 'koa-views';
import { RedisOptions } from 'ioredis';
export declare const ALL = "__All__";
export declare type paramType = 'Params' | 'Query' | 'Body' | 'Cookie' | 'Session' | 'Headers';
export declare type Methods = 'Post' | 'Get' | 'Head' | 'Put' | 'Patch' | 'Option' | 'Delete';
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
export declare const controllerMethodsMap: WeakMap<Object, Map<string | symbol, {
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
        typeValue: any;
        decorateType: string;
        decorateValue: string;
    }[];
    paramsType: {};
}>>;
export declare type RioType<T extends U, U = any> = T;
