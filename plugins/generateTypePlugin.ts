import path from 'path';
import { IceFs } from '../util/rio-fs';
import fs from 'fs';
import { BasePlugin, IcePlugin } from './basePlugin';
import { IceEnv } from '../util/type';
const rootDir = process.cwd();

const typingAbsoluteDir = path.join(rootDir, '/__autoGenerate__/typings');
let iceFs = new IceFs();
export class GenerateTypePlugin extends BasePlugin implements IcePlugin {
  public result = '';
  public tableAttr = '';
  public serverAttr = '';
  public DBStr = '';
  public ServerStr = '';
  async beforeProcessModel() {
    iceFs.makeDir(typingAbsoluteDir);
    iceFs.deleteAllFile(typingAbsoluteDir);
    this.result += `import {Model,ModelCtor} from 'ice-rio';
    `;
  }
  async traverseModel(config: {
    fileName: string;
    model: any;
    modelDir: string;
  }) {
    const { fileName } = config;
    this.tableAttr += `${fileName}:ModelCtor<Model<Record<any,any>>>;
    `;
  }
  async beforeProcessServer() {
    this.DBStr += `export interface IceServerTable{
      ${this.tableAttr}
    }`;
  }

  async traverseServer(config: { fileName: string; serverDir: string }) {
    const { fileName, serverDir } = config;
    this.result += `import ${fileName} from '${path.join(serverDir, fileName)}';
`;
    this.serverAttr += `${fileName}: ${fileName};
`;
  }
  async beforeProcessController() {
    this.ServerStr += `export interface IceServerApp{
      ${this.serverAttr}
    }`;
  }
  async afterProcessController() {
    this.result += `
    declare module 'ice-rio' {
      ${this.ServerStr}
      ${this.DBStr}
    }`;
    // bug1
    fs.writeFileSync(path.join(typingAbsoluteDir, './index.ts'), this.result);
  }
}
