/// <reference types="koa-bodyparser" />
import Koa, { Middleware } from 'koa';
import { ILoad } from './util/constants';
export interface IConfig {
    hooks?: {
        beforeCreated?: Middleware[];
        afterCreated?: Middleware[];
    };
}
export declare class HttpServer extends Koa {
    config: IConfig;
    private loadConfig;
    constructor(config: IConfig);
    init(): void;
    load({ dir, initDb, apiDoc, dbConfig, apiDocDir, env }: ILoad): Promise<void>;
    listen(...config: any[]): this;
}
export * from './lib/controller';
export * from './lib/initMethod';
export * from './middleWare';
export * from './util';
