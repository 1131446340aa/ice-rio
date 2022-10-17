import 'reflect-metadata';
import Koa from 'koa';
import { ILoad } from '../util/constants';
import { IcePlugin } from '../plugins/basePlugin';
export declare function load(app: Koa, { initDb, dbConfig, env, appDir, viewsConfig, plugins }: ILoad & {
    plugins: IcePlugin[];
}): Promise<void>;
export declare function lifecycleListener(plugins: any[], lifeCycle: string, config?: Record<string, any>): Promise<void>;
