import { BasePlugin, IcePlugin } from './basePlugin';
import { IceFs } from '../util/rio-fs';
import path from 'path';
import fs from 'fs';
import { CONTROLLER_KEY } from '../lib/controller';
import { controllerMethodsMap, ALL } from '../util/constants';
import WebSocket from 'ws';
import { Server } from 'node:http';
const rootDir = process.cwd();
const controllerMethodsMapDir = path.join(
  rootDir,
  '/__autoGenerate__/autoGenerateControllerMethods'
);
const serverJSONAbsoluteDir = path.join(
  rootDir,
  '/__autoGenerate__/serverJSON'
);
const controllerMethodsMapFile = controllerMethodsMapDir + '/index.ts';
let iceFs = new IceFs();
export class ClientRequestMethodPlugin extends BasePlugin implements IcePlugin {
  public clientRequestMethod: Record<string, any> = {};
  async beforeProcessModel() {
    iceFs.makeDir(serverJSONAbsoluteDir);
    iceFs.deleteAllFile(serverJSONAbsoluteDir);
  }
  async traverseController(config: {
    controller: any;
    controllerDir: string;
    fileName: string;
  }) {
    const { controller } = config;
    const metadata = Reflect.getMetadata(CONTROLLER_KEY, controller);
    this.clientRequestMethod[controller.name] = {};
    (this.env === 'prod'
      ? (await import(controllerMethodsMapFile.slice(0, -3))).default
      : controllerMethodsMap
    )
      .get(controller.prototype)
      //@ts-ignore
      .forEach((value, methodName) => {
        this.clientRequestMethod[controller.name][methodName] = {
          body: {},
          headers: {},
          returnType: value.returnType,
          method: value.methodDescription.method,
          routerName: value.methodDescription.path,
          params: {},
          query: {},
          path: metadata.path
        };
        let v = this.clientRequestMethod[controller.name][methodName];
        //@ts-ignore
        value?.params?.forEach((i) => {
          i.decorateValue === ALL
            ? (v[i.decorateType.toLowerCase()] = {
                ...v[i.decorateType.toLowerCase()],
                ...value.paramsType[i.name]
              })
            : (v[i.decorateType.toLowerCase()][i.name] =
                //@ts-ignore
                value.paramsType[i.name]);
        });
      });
  }
  async afterProcessController() {
    fs.writeFileSync(
      path.join(serverJSONAbsoluteDir, './serverJSON.json'),
      JSON.stringify(this.clientRequestMethod)
    );
  }
  async beforeListen(config: { server: Server }) {
    if (this.env === 'build') return;
    const { server } = config;
    const WebSocketApi = (wss: WebSocket.Server<WebSocket.WebSocket>) => {
      wss.on('connection', function connection(ws) {
        const serverJSONAbsoluteDir = path.join(
          rootDir,
          '/__autoGenerate__/serverJSON/serverJSON.json'
        );

        ws.send(String(fs.readFileSync(serverJSONAbsoluteDir)));
      });
    };

    const wss = new WebSocket.Server({ server, path: '/websockets' });
    WebSocketApi(wss);
  }
}
