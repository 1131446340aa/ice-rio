import koaBodyParser from 'koa-bodyparser';
import Koa, { Middleware } from 'koa';
import { lifecycleListener, load } from './lib/load';
import { ILoad } from './util/constants';
import cluster from 'cluster'
import { createServer, Server } from 'http'
export interface IConfig {
  hooks?: {
    beforeCreated?: Middleware[];
    afterCreated?: Middleware[];
  };
  plugins:IcePlugin[]
  // plugins:any[]
}
import { IcePlugin } from './plugins/basePlugin';
export class IceRio extends Koa {
 //@ts-ignore
  private loadConfig: ILoad = {}
  constructor(public config: IConfig) {
    super();
    this.init();
  }
  init () {
    this.config?.hooks?.beforeCreated?.forEach((i) => {
      this.use(i);
    });
    this.use(koaBodyParser());
  }
  async load ({
    initDb = false,
    enableApiDoc = false,
    appDir,
    //@ts-ignore
    dbConfig = {},
    apiDocDir = '',
    env = 'dev',
    viewsConfig = {},
    worker = 1,
    redisConfig = {},
  }: ILoad) {
    this.loadConfig = {
      initDb,
      enableApiDoc,
      dbConfig,
      apiDocDir,
      appDir,
      env,
      viewsConfig,
      worker,
    }
    //@ts-ignore
    await load(this, { initDb, dbConfig, enableApiDoc, apiDocDir, env, appDir, viewsConfig, redisConfig,plugins:this.config.plugins });
    this.config?.hooks?.afterCreated?.forEach((i) => {
      this.use(i);
    });
  }
  // @ts-ignore
  override async listen (...config: any[]) {
    const server = createServer(this.callback())
    await lifecycleListener(this.config.plugins,'beforeListen',{server})
    if(this.loadConfig.env === 'build') return this
    this.loadConfig?.worker === 1 ? server.listen(...config) : this.createCluster(server,config);
    return this
  }

  private createCluster (server:Server,config: any[]) {
    if (cluster.isMaster) {
      this.loadConfig.worker = Math.max(this.loadConfig?.worker || 1, require('os').cpus().length);
      for (let i = 0; i < this.loadConfig.worker; i++) { // 使用 cluster.fork 创建子进程
        cluster.fork();
      }
      cluster.on('exit', (worker) => {
        console.log(`工作进程 ${worker.process.pid} 已退出`);
        cluster.fork();
      });
    } else {
      server.listen(...config);
      console.log(`工作进程 ${process.pid} 已启动`);
    }
  }
}

export * from './lib/controller';



export * from './middleWare';

export * from './util';


export * from './lib/initMethod';

export { Context } from 'koa'

export { Server, IceServerApp, IceServerTable } from './lib/server'

export * from './lib/createRequestServer'

export {RioType} from './util/constants'

export * from './plugins/apiDocPlugin'

export * from './plugins/parsePlugin'

export * from './plugins/parseInterfacePlugin'

export * from './plugins/clientRequestMethodPlugin'

export * from './plugins/generateTypePlugin'

export * from './plugins/basePlugin'