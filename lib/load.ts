import fs from 'fs';
import path from 'path';
import 'reflect-metadata';
import Koa from 'koa';
import { CONTROLLER_KEY } from './controller';
import { Sequelize } from 'sequelize';
import initSeq from '../util/sequelize';
import { generateFinalParams, getValidatedTypeMap, parse } from '../util/babel';
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
  app.use(require('koa-static')(viewsDir));
  app.use(views(viewsDir, viewsConfig));
  iceFs.makeDir(path.join(rootDir, '/__autoGenerate__'));
  iceFs.makeDir(typingAbsoluteDir);
  iceFs.deleteAllFile(typingAbsoluteDir);
  iceFs.makeDir(serverJSONAbsoluteDir);
  iceFs.deleteAllFile(serverJSONAbsoluteDir);

  let interfaceIceServerTable = '';
  //@ts-ignore
  if (!Server.prototype.__singleRides__) {
    Object.keys(redisConfig).length &&
      //@ts-ignore
      (Server.prototype.__singleRides__ = new Redis({ ...redisConfig }));
  }
  if (initDb && dbConfig) {
    interfaceIceServerTable = await processDb(
      dbConfig,
      typingAbsoluteDir,
      modelDir,
      interfaceIceServerTable
    );
  }

  let interfaceIceServerApp = await processServer(ServerDir, typingAbsoluteDir);
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

  if (env === 'build') {
    processApiDoc(
      controllerMethodsMapDir,
      enableApiDoc,
      apiDocAbsoluteDir,
      controllerMethodsMapFile
    );
  }
  if (env !== 'prod') {
    console.log('开始处理 validated 文件');
    let date = Date.now();
    getValidatedTypeMap();
    console.log(`处理 validated 文件完成,耗时 ${Date.now() - date} ms`);
  }
  await processController(
    controllerDir,
    env!,
    controllerMethodsMapFile,
    enableApiDoc,
    apiDocAbsoluteDir,
    serverJSONAbsoluteDir,
    app
  );
  if (enableApiDoc && env !== 'build' && apiDocDir) {
    const Mount = require('koa-mount');
    app.use(Mount('/', require('koa-static')(apiDocDir)));
  }
}

async function processController(
  controllerDir: string,
  env: string,
  controllerMethodsMapFile: string,
  enableApiDoc: boolean,
  apiDocAbsoluteDir: string,
  serverJSONAbsoluteDir: string,
  app: Koa<Koa.DefaultState, Koa.DefaultContext>
) {
  let p: Record<string, any> = {};
  if (fs.existsSync(controllerDir)) {
    let time = Date.now();
    console.log('开始扫描 controller 目录');
    for (let i of fs.readdirSync(controllerDir)) {
      const fileName = path.join(controllerDir, i);
      const controller = (await import(fileName))?.default;
      if (typeof controller === 'function') {
        controller.prototype.__env__ = env;
        controller.prototype.__dir__ = controllerMethodsMapFile.slice(0, -3);
        const metadata = Reflect.getMetadata(CONTROLLER_KEY, controller);
        if (env !== 'prod') {
          if (fileName.endsWith('.js')) {
            throw new Error('The ICE_ENV please set prod');
          }
          const ast = parse(fileName);
          generateFinalParams(ast, controller.prototype, enableApiDoc);

          if (env === 'build') {
            iceFs.BeforeAppend(
              controllerMethodsMapFile,
              `import ${controller.name} from '${path
                .relative(apiDocAbsoluteDir, fileName)
                .slice(0, -3)}'`
            );
            fs.appendFileSync(
              controllerMethodsMapFile,
              `const ${i.slice(0, -3)}Map = new Map
`
            );

            controllerMethodsMap
              .get(controller.prototype)
              ?.forEach((value, key) => {
                fs.appendFileSync(
                  controllerMethodsMapFile,
                  `${i.slice(0, -3)}Map.set('${String(key)}',${JSON.stringify(
                    value
                  )})
`
                );
              });
            fs.appendFileSync(
              controllerMethodsMapFile,
              `controllerMethodsMap.set(${controller.name}.prototype,${i.slice(
                0,
                -3
              )}Map)
`
            );
          }
        }

        if (env === 'build' && enableApiDoc) {
          const controllerMethods =
            controllerMethodsMap.get(controller.prototype) || new Map();
          controllerMethods.forEach((v, key) => {
            let u = controllerMethods?.get(key);
            u.methodDescription.controller = metadata.path;
            u.methodDescription.fileName = i.split('.')[0];
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
        p[controller.name] = {};
        (env === 'prod'
          ? (await import(controllerMethodsMapFile.slice(0, -3))).default
          : controllerMethodsMap
        )
          .get(controller.prototype)
          //@ts-ignore
          .forEach((value, methodName) => {
            p[controller.name][methodName] = {
              body: {},
              headers: {},
              returnType: value.returnType,
              method: value.methodDescription.method,
              routerName: value.methodDescription.path,
              params: {},
              query: {},
              path: metadata.path
            };
            let v = p[controller.name][methodName];
            //@ts-ignore
            value?.params?.forEach((i) => {
              if (i.decorateValue === ALL) {
                v[i.decorateType.toLowerCase()] = {
                  ...v[i.decorateType.toLowerCase()],
                  ...value.paramsType[i.name]
                };
              } else {
                v[i.decorateType.toLowerCase()][i.name] =
                  //@ts-ignore
                  value.paramsType[i.name];
              }
            });
          });
        fs.writeFileSync(
          path.join(serverJSONAbsoluteDir, './serverJSON.json'),
          JSON.stringify(p)
        );
        const { router } = controller.prototype;
        router.prefix(metadata.path);
        app.use(router.routes());
        app.use(router.allowedMethods());
        Reflect.construct(controller, []);
      } else {
        throw new Error(
          'it only allowed use export default a class in the files of controller dir'
        );
      }
    }
    console.log(`扫描 controller 目录完成,耗时 ${Date.now() - time} ms`);
    if (env === 'build') {
      fs.appendFileSync(
        controllerMethodsMapFile,
        `export default controllerMethodsMap`
      );
    }
  }
}

function processApiDoc(
  controllerMethodsMapDir: string,
  enableApiDoc: boolean,
  apiDocAbsoluteDir: string,
  controllerMethodsMapFile: string
) {
  iceFs.makeDir(controllerMethodsMapDir);
  iceFs.deleteAllFile(controllerMethodsMapDir);
  if (enableApiDoc) {
    iceFs.makeDir(apiDocAbsoluteDir);
    iceFs.deleteAllFile(apiDocAbsoluteDir);
  }

  fs.writeFileSync(
    controllerMethodsMapFile,
    `const controllerMethodsMap = new Map
`
  );
}

async function processServer(ServerDir: string, typingAbsoluteDir: string) {
  let interfaceIceServerApp = '';
  let time = Date.now();
  console.log('开始扫描 server 目录');
  for (let i of fs.readdirSync(ServerDir)) {
    const name = path.join(ServerDir, i)
    const server = (await import(name))?.default;
    if (typeof server === 'function') {
      let fileName = i.split('.')?.[0];
      //@ts-ignore
      Server.prototype['app'][fileName] = new server();
      fs.appendFileSync(
        path.join(typingAbsoluteDir, './index.ts'),
        `import ${fileName} from '${path.join(ServerDir, fileName)}';
`
      );
      interfaceIceServerApp += `${fileName}: ${fileName};
`;
    } else {
      throw new Error(
        'it only allowed use export default a object in the files of model dir'
      );
    }
  }
  console.log(`扫描 server 目录完成,耗时 ${Date.now() - time} ms`);
  return interfaceIceServerApp;
}

async function processDb(
  dbConfig: {
    port: number;
    host: string;
    database: string;
    username: string;
    password: string;
    dialect: string;
    is_stress?: boolean;
  },
  typingAbsoluteDir: string,
  modelDir: string,
  interfaceIceServerTable: string
) {
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
  for (let i of fs.readdirSync(modelDir)) {
    const model = (await import(path.join(modelDir, i)))?.default;
    if (typeof model === 'object') {
      let fileName = i.split('.')?.[0];
      //@ts-ignore
      Server.prototype['table'][fileName] = s.define(
        underline(fileName),
        model
      );
      interfaceIceServerTable += `${fileName}:ModelCtor<Model<Record<any,any>>>;
`;
      if (is_stress) {
        //@ts-ignore
        Server.prototype['table'][fileName]['stress'] = s.define(
          `${underline(fileName)}_stress`,
          model
        );
      }
    } else {
      throw new Error(
        'it only allowed use export default a object in the files of model dir'
      );
    }
  }

  await initSeq(s);
  console.log(`数据库初始完成,耗时 ${Date.now() - time} ms`);
  return interfaceIceServerTable;
}
