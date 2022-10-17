import { Server } from 'node:http';
import { IceEnv } from '../util/type';

export abstract class IcePlugin {
  public env: IceEnv;
  public app: any;
  // public app:IceRio
  async beforeProcessModel?() {}
  async traverseModel?(config: {
    fileName: string;
    model: any;
    modelDir: string;
  }) {}
  async beforeProcessServer?() {}
  async traverseServer?(config: { fileName: string; serverDir: string }) {}

  async beforeProcessController?() {}
  async traverseController?(config: {
    controller: any;
    controllerDir: string;
    fileName: string;
  }) {}
  async afterProcessController?() {}
  async beforeListen?(config: { server: Server }) {}
}

export class BasePlugin {
  set env(v: IceEnv) {
    // @ts-ignore
    this.__env__ = v;
  }
  get env() {
    // @ts-ignore
    return this.__env__;
  }
  set app(v:any) {
     // @ts-ignore
    this.__app__ = v;
  }
  get app() {
     // @ts-ignore
    return this.__app__;
  }
}
