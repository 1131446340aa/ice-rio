import { All, routerFn } from '../util/constants';
export declare const Query: (attr?: string | typeof All) => ParameterDecorator;
export declare const Body: (attr?: string | typeof All) => ParameterDecorator;
export declare const Params: (attr?: string | typeof All) => ParameterDecorator;
export declare const post: routerFn, get: routerFn, head: routerFn, put: routerFn, patch: routerFn, options: routerFn;
