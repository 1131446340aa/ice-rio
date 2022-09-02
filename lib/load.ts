import fs from 'fs';
import path from 'path';
import 'reflect-metadata';
import Koa from 'koa';
import { CONTROLLER_KEY } from './controller';
import { Sequelize } from 'sequelize';
import initSeq from '../util/sequelize';
import { generateFinalParams, getValidatedTypeStore, parse } from './babel';
import { ALL, controllerMethodsMap, ILoad } from '../util/constants';
import { generateApiDoc } from '../util/generateApiDoc';
import { IceFs } from '../util/rio-fs';
import views from 'koa-views';
import { Server } from './server';
import { underline } from '../util';
import Redis from 'ioredis';
/**
 * @description: 自动导入 controller 目录下所有类，并加载,
 * @param {*}
 * @return {*}
 */
const rootDir = process.cwd();
let iceFs = new IceFs();

/**
 * @description: Ice Rio 的加载方法
 * @return {*}
 */
export async function load(
  app: Koa,
  {
    initDb = false,
    enableApiDoc = false,
    apiDocDir,
    dbConfig,
    env,
    appDir = '',
    viewsConfig,
    redisConfig
  }: ILoad
) {
  const appDirAbsolutePath = path.join(rootDir, appDir);
  const controllerMethodsMapDir = path.join(
    rootDir,
    '/__autoGenerate__/autoGenerateControllerMethods'
  );
  const controllerMethodsMapFile = controllerMethodsMapDir + '/index.ts';
  const controllerDir = appDirAbsolutePath + '/controller';
  const apiDocAbsoluteDir = path.join(rootDir, '/__autoGenerate__/apiDoc');
  const typingAbsoluteDir = path.join(rootDir, '/__autoGenerate__/typings');
  const serverJSONAbsoluteDir = path.join(
    rootDir,
    '/__autoGenerate__/serverJSON'
  );
  const modelDir = appDirAbsolutePath + '/model';
  const ServerDir = appDirAbsolutePath + '/server';
  const viewsDir = appDirAbsolutePath + '/views';
  init();
  await processServerAndDBAndAutoGenerateType();

  await processController({
    controllerDir,
    env: env!,
    controllerMethodsMapFile,
    enableApiDoc,
    apiDocAbsoluteDir,
    serverJSONAbsoluteDir,
    app
  });

  async function processServerAndDBAndAutoGenerateType() {
    let interfaceIceServerTable = '';
    initDb &&
      dbConfig &&
      (interfaceIceServerTable = await processDb({
        dbConfig,
        typingAbsoluteDir,
        modelDir
      }));

    let interfaceIceServerApp = await processServer(
      ServerDir,
      typingAbsoluteDir
    );
    fs.appendFileSync(
      path.join(typingAbsoluteDir, './index.ts'),
      ` declare module 'ice-rio' {
      export interface IceServerApp{
        ${interfaceIceServerApp}
      }
      export interface IceServerTable{
        ${interfaceIceServerTable}
      }
   }`
    );
  }
  /**
   * @description: 在处理 mvc 层时的一些操作
   * @return {*}
   */
  function init() {
    app.use(require('koa-static')(viewsDir));
    app.use(views(viewsDir, viewsConfig));
    iceFs.makeDir(path.join(rootDir, '/__autoGenerate__'));
    iceFs.makeDir(typingAbsoluteDir);
    iceFs.deleteAllFile(typingAbsoluteDir);
    iceFs.makeDir(serverJSONAbsoluteDir);
    iceFs.deleteAllFile(serverJSONAbsoluteDir);
    if (enableApiDoc && env !== 'build' && apiDocDir) {
      const Mount = require('koa-mount');
      app.use(Mount('/', require('koa-static')(apiDocDir)));
    }
    if (env !== 'prod') {
      console.log('开始处理 validated 文件');
      let date = Date.now();
      getValidatedTypeStore();
      console.log(`处理 validated 文件完成,耗时 ${Date.now() - date} ms`);
    }

    if (env === 'build') {
      if (enableApiDoc) {
        iceFs.makeDir(apiDocAbsoluteDir);
        iceFs.deleteAllFile(apiDocAbsoluteDir);
      }
      iceFs.makeDir(controllerMethodsMapDir);
      iceFs.deleteAllFile(controllerMethodsMapDir);

      fs.writeFileSync(
        controllerMethodsMapFile,
        `const controllerMethodsMap = new Map
    `
      );
    }
    //@ts-ignore
    !Server.prototype.__singleRides__ &&
      Object.keys(redisConfig).length &&
      //@ts-ignore
      (Server.prototype.__singleRides__ = new Redis({ ...redisConfig }));
  }
}
/**
 * @description: 处理 controller 层相关逻辑
 * @return {*}
 */
async function processController({
  controllerDir,
  env,
  controllerMethodsMapFile,
  enableApiDoc,
  apiDocAbsoluteDir,
  serverJSONAbsoluteDir,
  app
}: {
  controllerDir: string;
  env: string;
  controllerMethodsMapFile: string;
  enableApiDoc: boolean;
  apiDocAbsoluteDir: string;
  serverJSONAbsoluteDir: string;
  app: Koa;
}) {
  let clientRequestMethod: Record<string, any> = {};
  if (fs.existsSync(controllerDir)) {
    let time = Date.now();
    console.log('开始扫描 controller 目录');
    await traverseController();
    console.log(`扫描 controller 目录完成,耗时 ${Date.now() - time} ms`);
    env === 'build' &&
      fs.appendFileSync(
        controllerMethodsMapFile,
        `export default controllerMethodsMap`
      );
  }
  /**
   * @description: 遍历每一个 controller 文件
   * @return {*}
   */
  async function traverseController() {
    for (let controllerFileName of fs.readdirSync(controllerDir)) {
      const fileName = path.join(controllerDir, controllerFileName);
      const controller = (await import(fileName))?.default;
      if (typeof controller !== 'function') {
        throw new Error(
          'controller 目录中的文件必须被 export default 导出一个 class'
        );
      }
      await initController(controller, controllerFileName);
    }
  }

  async function initController(
    controller: Function,
    controllerFileName: string
  ) {
    const fileName = path.join(controllerDir, controllerFileName);
    controller.prototype.__env__ = env;
    controller.prototype.__dir__ = controllerMethodsMapFile.slice(0, -3);
    const metadata = Reflect.getMetadata(CONTROLLER_KEY, controller);
    if (env !== 'prod') {
      if (fileName.endsWith('.js'))
        throw new Error('在 js 代码中请将 env 设置为 prod');
      const ast = parse(fileName);
      generateFinalParams(ast, controller.prototype, enableApiDoc);
    }
    if (env === 'build') {
      writeControllerMethodFile();
      enableApiDoc && writeControllerMethodDescription();
    }

    await writeClientRequestMethod();

    const { router } = controller.prototype;
    router.prefix(metadata.path);
    app.use(router.routes());
    app.use(router.allowedMethods());
    Reflect.construct(controller, []);
    /**
     * @description: 生成客户端请求服务端所需的文件内容
     * @return {*}
     */
    async function writeClientRequestMethod() {
      clientRequestMethod[controller.name] = {};
      (env === 'prod'
        ? (await import(controllerMethodsMapFile.slice(0, -3))).default
        : controllerMethodsMap
      )
        .get(controller.prototype)
        //@ts-ignore
        .forEach((value, methodName) => {
          clientRequestMethod[controller.name][methodName] = {
            body: {},
            headers: {},
            returnType: value.returnType,
            method: value.methodDescription.method,
            routerName: value.methodDescription.path,
            params: {},
            query: {},
            path: metadata.path
          };
          let v = clientRequestMethod[controller.name][methodName];
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

      fs.writeFileSync(
        path.join(serverJSONAbsoluteDir, './serverJSON.json'),
        JSON.stringify(clientRequestMethod)
      );
    }
    /**
     * @description: 为 controllerMethodsMap 的 description 赋值
     * @return {*}
     */
    function writeControllerMethodDescription() {
      const controllerMethods =
        controllerMethodsMap.get(controller.prototype) || new Map();
      controllerMethods.forEach((v, key) => {
        let u = controllerMethods?.get(key);
        u.methodDescription.controller = metadata.path;

        u.methodDescription.fileName = controllerFileName.split('.')[0];
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
          fs.appendFileSync(writeDir, ret);
        }
      });
    }
    /**
     * @description: 将整个 babel 编译后的结果写入文件系统，供线上环境使用
     * @return {*}
     */
    function writeControllerMethodFile() {
      iceFs.BeforeAppend(
        controllerMethodsMapFile,
        `import ${controller.name} from '${path
          .relative(apiDocAbsoluteDir, fileName)
          .slice(0, -3)}'`
      );
      fs.appendFileSync(
        controllerMethodsMapFile,
        `const ${controllerFileName.slice(0, -3)}Map = new Map
  `
      );

      controllerMethodsMap.get(controller.prototype)?.forEach((value, key) => {
        fs.appendFileSync(
          controllerMethodsMapFile,
          `${controllerFileName.slice(0, -3)}Map.set('${String(
            key
          )}',${JSON.stringify(value)})
  `
        );
      });
      fs.appendFileSync(
        controllerMethodsMapFile,
        `controllerMethodsMap.set(${
          controller.name
        }.prototype,${controllerFileName.slice(0, -3)}Map)
  `
      );
    }
  }
}
/**
 * @description: 处理整个 server 层相关逻辑
 * @param {string} ServerDir
 * @param {string} typingAbsoluteDir
 * @return {*}
 */
async function processServer(ServerDir: string, typingAbsoluteDir: string) {
  let interfaceIceServerApp = '';
  let time = Date.now();
  console.log('开始扫描 server 目录');
  await traverseServer();
  console.log(`扫描 server 目录完成,耗时 ${Date.now() - time} ms`);
  return interfaceIceServerApp;
  /**
   * @description: 遍历每一个 server 文件
   * @return {*}
   */
  async function traverseServer() {
    for (let serverFileName of fs.readdirSync(ServerDir)) {
      const name = path.join(ServerDir, serverFileName);
      const server = (await import(name))?.default;
      if (typeof server !== 'function') {
        throw new Error('server 必须通过 export default 导出一个 class');
      }
      interfaceIceServerApp = initServer({
        serverFileName,
        server,
        typingAbsoluteDir,
        ServerDir,
        interfaceIceServerApp
      });
    }
  }
}

/**
 * @description: 初始化自动化生成 server 层所需 ts 的文件
 * @return {*}
 */
function initServer({
  serverFileName,
  server,
  typingAbsoluteDir,
  ServerDir,
  interfaceIceServerApp
}: {
  serverFileName: string;
  server: any;
  typingAbsoluteDir: string;
  ServerDir: string;
  interfaceIceServerApp: string;
}) {
  let fileName = serverFileName.split('.')?.[0];
  //@ts-ignore
  Server.prototype['app'][fileName] = new server();
  fs.appendFileSync(
    path.join(typingAbsoluteDir, './index.ts'),
    `import ${fileName} from '${path.join(ServerDir, fileName)}';
`
  );
  interfaceIceServerApp += `${fileName}: ${fileName};
`;
  return interfaceIceServerApp;
}

/**
 * @description: 处理 model 层的逻辑
 * @return {*}
 */
async function processDb({
  dbConfig,
  typingAbsoluteDir,
  modelDir
}: {
  dbConfig: ILoad['dbConfig'];
  typingAbsoluteDir: string;
  modelDir: string;
}) {
  let interfaceIceServerTable = '';
  let time = Date.now();
  console.log('开始初始化数据库');
  const {
    port,
    host,
    database,
    username,
    password,
    dialect,
    is_stress = false
  } = dbConfig;
  const s = new Sequelize(database, username, password, {
    host,
    //@ts-ignore
    dialect,
    port
  });
  fs.appendFileSync(
    path.join(typingAbsoluteDir, './index.ts'),
    `import {Model,ModelCtor} from 'ice-rio';
`
  );
  await traverseModel();

  await initSeq(s);
  console.log(`数据库初始完成,耗时 ${Date.now() - time} ms`);
  return interfaceIceServerTable;
  /**
   * @description: 遍历每一个 model
   * @return {*}
   */
  async function traverseModel() {
    for (let modelName of fs.readdirSync(modelDir)) {
      const model = (await import(path.join(modelDir, modelName)))?.default;
      if (typeof model !== 'object') {
        throw new Error(
          'model 层的文件必须使用 export default 导出一个符合 sequelize 建表规范的对象'
        );
      }
      processModelItem(model, model);
    }
  }

  function processModelItem(modelName: string, model: any) {
    let fileName = modelName.split('.')?.[0];
    //@ts-ignore
    Server.prototype['table'][fileName] = s.define(underline(fileName), model);
    interfaceIceServerTable += `${fileName}:ModelCtor<Model<Record<any,any>>>;
`;
    is_stress &&
      //@ts-ignore
      (Server.prototype['table'][fileName]['stress'] = s.define(
        `${underline(fileName)}_stress`,
        model
      ));
  }
}
