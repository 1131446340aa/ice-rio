import { IceFs } from '../util/rio-fs';
import fs from 'fs';

import path from 'path';
let iceFs = new IceFs();
import { generateFinalParams, parse } from '../lib/babel';
import { controllerMethodsMap } from '../util/constants';
import { BasePlugin, IcePlugin } from './basePlugin';
import { IceEnv } from '../util/type';
const rootDir = process.cwd();
const controllerMethodsMapDir = path.join(
  rootDir,
  '/__autoGenerate__/autoGenerateControllerMethods'
);
const controllerMethodsMapFile = controllerMethodsMapDir + '/index.ts';
export class parsePlugin  extends BasePlugin implements IcePlugin {
  public result = '';
  async beforeProcessModel() {
    if (this.env === 'build') {
      iceFs.makeDir(controllerMethodsMapDir);
      iceFs.deleteAllFile(controllerMethodsMapDir);
      this.result += `const controllerMethodsMap = new Map
      `;
    }
  }
  async traverseController(config: {
    controller: any;
    controllerDir: string;
    fileName: string;
  }) {
    const { controller, controllerDir, fileName } = config;
    controller.prototype.__env__ = this.env;
    controller.prototype.__dir__ = controllerMethodsMapFile.slice(0, -3);

    if (this.env !== 'prod') {
      const ast = parse(path.join(controllerDir, fileName));
      generateFinalParams(ast, controller.prototype);
    }
    if (this.env === 'build') {
      this.result =
        `import ${controller.name} from '${path
          .relative(controllerMethodsMapDir, path.join(controllerDir, fileName))}'
          ` + this.result;
    }
    this.result += `const ${fileName}Map = new Map
    `;
    controllerMethodsMap.get(controller.prototype)?.forEach((value, key) => {
      this.result += `${fileName}Map.set('${String(key)}',${JSON.stringify(
        value
      )})
`;
      this.result += `controllerMethodsMap.set(${controller.name}.prototype,${fileName}Map)
`;
    });
  }
  async afterProcessController() {
    if (this.env === 'build') {
      this.result += `export default controllerMethodsMap`;
      fs.writeFileSync(controllerMethodsMapFile, this.result);
    }
  }
}
