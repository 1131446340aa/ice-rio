import fs from 'fs';
import path from 'path';
import 'reflect-metadata';
import Koa from 'koa';
import { CONTROLLER_KEY } from './controller';
import { Sequelize } from 'sequelize';
import initSeq from '../util/sequelize';
import { generateFinalParams, parse } from '../util/babel';
import {
  controllerMethodsApiDocMap,
  controllerMethodsReturnMap,
  ILoad,
  typeMap,
  controllerMethodsDescriptionMap
} from '../util/constants';
import { generateApiDoc } from '../util/generateApiDoc';
import Router from 'koa-router';
import { IceFs } from '../util/rio-fs';
const views = require('koa-views');
/**
 * @description: 自动导入 controller 目录下所有类，并加载,
 * @param {*}
 * @return {*}
 */
export async function load(
  app: Koa,
  {
    rootDir,
    initDb = false,
    enAbleApiDoc = false,
    apiDocDir,
    dbConfig,
    env,
    appDir = ''
  }: ILoad
) {
  const appDirAbsolutePath = path.join(rootDir, appDir);
  if (initDb) {
    const modelDir = appDirAbsolutePath + '/model';
    const { port, host, database, username, password, dialect } = dbConfig;
    const s = new Sequelize(database, username, password, {
      host,
      //@ts-ignore
      dialect,
      port
    });
    for (let i of fs.readdirSync(modelDir)) {
      const model = (await import(path.join(modelDir, i)))?.default;
      if (typeof model === 'object') {
        let fileName = i.split('.')?.[0];
        //@ts-ignore
        Koa.prototype[fileName] = s.define(fileName, model);
      } else {
        throw new Error(
          'it only allowed use export default a object in the files of model dir'
        );
      }
    }
    await initSeq(s);
  }
  let iceFs = new IceFs();
 
  const requireMapDir = path.join(rootDir, '/__autoGenerate__/autoGenerateRequire');
  const requireMapFile = requireMapDir + '/index.ts';
  const controllerDir = appDirAbsolutePath + '/controller';
  const apiDocAbsoluteDir = path.join(rootDir, '/__autoGenerate__/apiDoc');
  if (env === 'build') {
    iceFs.makeDir(path.join(rootDir, '/__autoGenerate__'));
    iceFs.makeDir(requireMapDir);
    iceFs.deleteAllFile(requireMapDir);
    iceFs.makeDir(apiDocAbsoluteDir);
    iceFs.deleteAllFile(apiDocAbsoluteDir);
    fs.writeFileSync(
      requireMapFile,
      `const requireMap = new Map
`
    );
  }
  if (fs.existsSync(controllerDir)) {
    for (let i of fs.readdirSync(controllerDir)) {
      const fileName = path.join(controllerDir, i);
      const controller = (await import(fileName))?.default;
      if (typeof controller === 'function') {
        controller.prototype.__env__ = env;
        controller.prototype.__dir__ = requireMapFile.slice(0, -3);
        if (env !== 'prod') {
          const ast = parse(fileName);
          generateFinalParams(ast, controller.prototype, controllerDir);
          if (env === 'build') {
            
            iceFs.BeforeAppend(
              requireMapFile,
              `import ${controller.name} from '${path
                .relative(apiDocAbsoluteDir, fileName)
                .slice(0, -3)}'`
            );
            fs.appendFileSync(
              requireMapFile,
              `const ${i.slice(0, -3)}Map = new Map
`
            );

            //@ts-ignore
            typeMap.get(controller.prototype)!.forEach((value, key: string) => {
              fs.appendFileSync(
                requireMapFile,
                `${i.slice(0, -3)}Map.set('${key}',${JSON.stringify(value)})
`
              );
            });
            fs.appendFileSync(
              requireMapFile,
              `requireMap.set(${controller.name}.prototype,${i.slice(0, -3)}Map)
`
            );
          }
        }
        const metadata = Reflect.getMetadata(CONTROLLER_KEY, controller);
        const { router } = controller.prototype;
        router.prefix(metadata.path);
        app.use(router.routes());
        app.use(router.allowedMethods());
        if (env === 'build' && enAbleApiDoc) {
          const controllerMethod =
            controllerMethodsApiDocMap.get(controller.prototype) || new Map();
          let paramsTypeMap = typeMap.get(controller.prototype);
          let returnTypeMap = controllerMethodsReturnMap.get(
            controller.prototype
          );
          let descprititionMap = controllerMethodsDescriptionMap.get(
            controller.prototype
          );

          controllerMethod.forEach((v) => {
            v.controller = metadata.path;
            v.fileName = i.split('.')[0];
            if (!v.params) v.params = [];
            let paramsMap = paramsTypeMap?.get(v.routerName) || {};
            let returnResult = returnTypeMap?.get(v.routerName) || {
              error: `please input return of ${v.controller}.${v.routerName}`
            };
            let descpritition =
              descprititionMap?.get(v.routerName) ||
              `please input @descpritition of ${v.controller}.${v.routerName}`;
            Object.keys(paramsMap).forEach((i) => {
              v.params.push({
                name: i,
                value: paramsMap[i]
              });
            });
            v.returns = { name: v.path, value: returnResult };
            v.descpritition = descpritition;
            const writeDir = path.join(apiDocAbsoluteDir, v.fileName + '.ts');
            let ret = generateApiDoc(v);
            fs.appendFileSync(writeDir, ret);
          });
        }
        Reflect.construct(controller, []);
      } else {
        throw new Error(
          'it only allowed use export default a class in the files of controller dir'
        );
      }
    }
    if (env === 'build') {
      fs.appendFileSync(requireMapFile, `export default requireMap`);
    }
  }

  if (enAbleApiDoc && env !== 'build' && apiDocDir) {
    let router = new Router();
    app.use(require('koa-static')(path.join(rootDir, apiDocDir)));
    try {
      app.use(
        views(path.join(rootDir, apiDocDir), {
          // extension: 'ejs'
        })
      );
      router.get('/', async (ctx) => {
        //@ts-ignore
        await ctx.render('./index.html');
      });
      app.use(router.routes());
      app.use(router.allowedMethods());
    } catch (error) {
      //@ts-ignore
      console.error(error.message);
    }
  }
}
