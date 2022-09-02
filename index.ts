import koaBodyParser from 'koa-bodyparser';
import Koa, { Middleware } from 'koa';
import { load } from './lib/load';
import { ILoad } from './util/constants';
import cluster from 'cluster'
import { createServer, Server } from 'http'
import WebSocket from 'ws';
export interface IConfig {
  hooks?: {
    beforeCreated?: Middleware[];
    afterCreated?: Middleware[];
  };
}
import fs from 'fs'
import path from 'path'
const rootDir = process.cwd()
export class IceRio extends Koa {
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
    redisConfig = {}
  }: ILoad) {
    this.loadConfig = {
      initDb,
      enableApiDoc,
      dbConfig,
      apiDocDir,
      appDir,
      env,
      viewsConfig,
      worker
    }
    //@ts-ignore
    await load(this, { initDb, dbConfig, enableApiDoc, apiDocDir, env, appDir, viewsConfig, redisConfig });
    this.config?.hooks?.afterCreated?.forEach((i) => {
      this.use(i);
    });
  }
  // @ts-ignore
  override listen (...config: any[]) {
    const server = createServer(this.callback())
    
    if (this.loadConfig.env !== 'build') {
      const WebSocketApi = (wss: WebSocket.Server<WebSocket.WebSocket>) => {
        wss.on('connection', function connection (ws) {
          const serverJSONAbsoluteDir = path.join(
            rootDir,
            '/__autoGenerate__/serverJSON/serverJSON.json'
          );
          
          ws.send(String(fs.readFileSync(serverJSONAbsoluteDir)));
        });
      }
  
      const wss = new WebSocket.Server({ server,path:'/websockets' });
      WebSocketApi(wss)
      this.loadConfig?.worker === 1 ? server.listen(...config) : this.createCluster(server,config);
    }
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
