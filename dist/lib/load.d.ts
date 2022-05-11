/// <reference types="koa-bodyparser" />
import 'reflect-metadata';
import Koa from 'koa';
import { ILoad } from '../util/constants';
export declare function load(app: Koa, { rootDir, initDb, enAbleApiDoc, apiDocDir, dbConfig, env, appDir }: ILoad): Promise<void>;
