import { Middleware } from 'koa';
export declare enum ErrorCode {
    ServiceError = 500,
    ParameterError = 422
}
export declare type routerFn = (path?: string, config?: {
    middleWare: Middleware[];
}) => any;
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
export declare type IceEnv = 'prod' | 'build' | 'dev';
