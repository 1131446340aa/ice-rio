import { routerFn } from '../util/type';
export declare const Query: (attr?: string) => ParameterDecorator;
export declare const Body: (attr?: string) => ParameterDecorator;
export declare const Params: (attr?: string) => ParameterDecorator;
export declare const Cookie: (attr?: string) => ParameterDecorator;
export declare const Session: (attr?: string) => ParameterDecorator;
export declare const Headers: (attr?: string) => ParameterDecorator;
export declare const Post: routerFn, Get: routerFn, Head: routerFn, Put: routerFn, Patch: routerFn, Option: routerFn, Delete: routerFn;
