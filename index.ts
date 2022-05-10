import koaBodyParser from 'koa-bodyparser';
import Koa, { Middleware } from 'koa';
import { load } from './lib/load';
import { ILoad } from './util/constants';
import  fs from 'fs';
import { join } from 'path';

export interface IConfig {
  hooks?: {
    beforeCreated?: Middleware[];
    afterCreated?: Middleware[];
  };
}
export class HttpServer extends Koa {
  //@ts-ignore
  private loadConfig:ILoad = {}
  constructor(public config: IConfig) {
    super();
    this.init();
  }
  init() {
    this.config?.hooks?.beforeCreated?.forEach((i) => {
      this.use(i);
    });
    this.use(koaBodyParser());
  }
  async load({
    dir,
    initDb = false,
    apiDoc = false,
    //@ts-ignore
    dbConfig = {},
    apiDocDir = '',
    env = 'dev'
  }: ILoad) {
    this.loadConfig = {dir,
      initDb,
      apiDoc,
      dbConfig,
      apiDocDir,
      env}
    //@ts-ignore
    await load(this, { dir, initDb, dbConfig, apiDoc, apiDocDir, env });
    this.config?.hooks?.afterCreated?.forEach((i) => {
      this.use(i);
    });
  }
  // @ts-ignore
  override listen(...config:any[]) {
    if (this.loadConfig.env === 'build') {
      return this
    }
    super.listen(...config);
    return this
  }
}

export * from './lib/controller';

export * from './lib/initMethod';

export * from './middleWare';

export * from './util';
