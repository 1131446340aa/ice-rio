import { Middleware } from 'koa';
export declare const All: unique symbol;
export declare type paramType = 'Params' | 'Query' | 'Body';
export declare type Methods = 'post' | 'get' | 'head' | 'put' | 'patch' | 'options';
export declare type routerFn = (path?: string, config?: {
    middleWare: Middleware[];
}) => any;
export declare const typeMap: WeakMap<Object, Map<string | symbol, Record<string, string>>>;
export declare const importedControllerMap: WeakMap<Object, Record<string, string>>;
export declare const controllerMethodsParamsIdxMap: WeakMap<Object, Map<string | symbol, string[]>>;
export declare const controllerMethodsReturnMap: WeakMap<Object, Map<string | symbol, any>>;
export declare const controllerMethodsDescriptionMap: WeakMap<Object, Map<string | symbol, string>>;
export declare const controllerMethodsApiDocMap: WeakMap<Object, Map<string | symbol, IGenerateApiDoc>>;
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
    env?: 'prod' | 'dev' | 'build';
}
