import { BasePlugin, IcePlugin } from './basePlugin';
import { IceFs } from '../util/rio-fs';
import path from 'path';
import fs from 'fs';
import { CONTROLLER_KEY } from '../lib/controller';
import { controllerMethodsMap } from '../util/constants';
import { generateApiDoc } from '../util/generateApiDoc';
const rootDir = process.cwd();
const apiDocAbsoluteDir = path.join(rootDir, '/__autoGenerate__/apiDoc');
let iceFs = new IceFs();
export class ApiDocPlugin extends BasePlugin implements IcePlugin {
  
  constructor( public dir: string, ) {
    super();
  }
  async beforeProcessModel() {
    if (this.env !== 'build') {
      const Mount = require('koa-mount');
      this.app.use(Mount('/', require('koa-static')(this.dir)));
    }
    if (this.env === 'build') {
      iceFs.makeDir(apiDocAbsoluteDir);
      iceFs.deleteAllFile(apiDocAbsoluteDir);
    }
  }
  async traverseController(config: {
    controller: any;
    controllerDir: string;
    fileName: string;
  }) {
    if(this.env !== 'build') return
    const { controller, fileName } = config;
    const metadata = Reflect.getMetadata(CONTROLLER_KEY, controller);
    const controllerMethods =
      controllerMethodsMap.get(controller.prototype) || new Map();
    controllerMethods.forEach((v, key) => {
      let u = controllerMethods?.get(key);
      u.methodDescription.controller = metadata.path;
      u.methodDescription.fileName = fileName;
      let typeMap = u.params.reduce((prev: any, curr: any) => {
        prev[curr.name] = curr.decorateType;
        return prev;
      }, {});
      if (!u.methodDescription.params) u.methodDescription.params = [];
      let paramsType = u?.paramsType || {};
      let returnResult = u.returnType || {};
      Object.keys(paramsType).forEach((i) => {
        u.methodDescription.params.push({
          name: i,
          //@ts-ignore
          value: paramsType[i],
          type: typeMap[i]
        });
      });
      if (u.methodDescription.params.length) {
        u.methodDescription.returns = {
          name: u.methodDescription.path,
          value: returnResult
        };
        const writeDir = path.join(
          apiDocAbsoluteDir,
          u.methodDescription.fileName + '.ts'
        );
        let ret = generateApiDoc(u.methodDescription);
        fs.writeFileSync(writeDir, ret);
      }
    });
  }
}



