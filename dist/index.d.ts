import Koa, { Middleware } from 'koa';
import { ILoad } from './util/constants';
export interface IConfig {
    hooks?: {
        beforeCreated?: Middleware[];
        afterCreated?: Middleware[];
    };
    plugins: IcePlugin[];
}
import { IcePlugin } from './plugins/basePlugin';
export declare class IceRio extends Koa {
    config: IConfig;
    private loadConfig;
    constructor(config: IConfig);
    init(): void;
    load({ initDb, enableApiDoc, appDir, dbConfig, apiDocDir, env, viewsConfig, worker, redisConfig, }: ILoad): Promise<void>;
    listen(...config: any[]): Promise<this>;
    private createCluster;
}
export * from './lib/controller';
export * from './middleWare';
export * from './util';
export * from './lib/initMethod';
export { Context } from 'koa';
export { Server, IceServerApp, IceServerTable } from './lib/server';
export * from './lib/createRequestServer';
export { RioType } from './util/constants';
export * from './plugins/apiDocPlugin';
export * from './plugins/parsePlugin';
export * from './plugins/parseInterfacePlugin';
export * from './plugins/clientRequestMethodPlugin';
export * from './plugins/generateTypePlugin';
export * from './plugins/basePlugin';
