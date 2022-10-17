import { getValidatedTypeStore } from '../lib/babel';
import { IceEnv } from '../util/type';
import { BasePlugin, IcePlugin } from './basePlugin';
export class ParseInterfacePlugin extends BasePlugin implements IcePlugin {
  // public app:IceRio
  constructor(public interfaceFileName: string) {
    super();
  }
  async beforeProcessModel() {
    if (this.env !== 'prod') {
      console.log(`开始处理 ${this.interfaceFileName} 文件`);
      let date = Date.now();
      getValidatedTypeStore(this.interfaceFileName);
      console.log(
        `处理 ${this.interfaceFileName} 文件完成,耗时 ${Date.now() - date} ms`
      );
    }
  }
}
