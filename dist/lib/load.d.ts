/// <reference types="koa-bodyparser" />
import 'reflect-metadata';
import Koa from 'koa';
import { ILoad } from '../util/constants';
export declare function load(app: Koa, { dir, initDb, apiDoc, apiDocDir, dbConfig, env }: ILoad): Promise<void>;
