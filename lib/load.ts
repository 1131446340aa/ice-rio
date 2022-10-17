import fs from 'fs';
import path from 'path';
import 'reflect-metadata';
import Koa from 'koa';
import { CONTROLLER_KEY } from './controller';
import { Sequelize } from 'sequelize';
import initSeq from '../util/sequelize';
import { ILoad } from '../util/constants';
import { IceFs } from '../util/rio-fs';
import views from 'koa-views';
import { Server } from './server';
import { underline } from '../util';
import { BasePlugin, IcePlugin } from '../plugins/basePlugin';
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
    dbConfig,
    env,
    appDir = '',
    viewsConfig,
    plugins
  }: ILoad & { plugins: IcePlugin[] }
) {
  // const plugins = plugins.map((i) => new i(env));

  const appDirAbsolutePath = path.join(rootDir, appDir);
  const controllerDir = appDirAbsolutePath + '/controller';
  const modelDir = appDirAbsolutePath + '/model';
  const ServerDir = appDirAbsolutePath + '/server';
  const viewsDir = appDirAbsolutePath + '/views';
  iceFs.makeDir(path.join(rootDir, '/__autoGenerate__'));
  init();
  await lifecycleListener(plugins, 'beforeProcessModel');
  initDb &&
    dbConfig &&
    (await processModel({
      dbConfig,
      plugins,
      modelDir
    }));

  await lifecycleListener(plugins, 'beforeProcessServer');

  await processServer(ServerDir, plugins);

  await lifecycleListener(plugins, 'beforeProcessController');
  await processController({
    controllerDir,
    app,
    plugins
  });
  await lifecycleListener(plugins, 'afterProcessController');
  /**
   * @description: 在处理 mvc 层时的一些操作
   * @return {*}
   */
  function init() {
    BasePlugin.prototype.env = env
    BasePlugin.prototype.app = app
    app.use(require('koa-static')(viewsDir));
    app.use(views(viewsDir, viewsConfig));
    iceFs.makeDir(path.join(rootDir, '/__autoGenerate__'));
  }
}
/**
 * @description: 处理 controller
 * P;POP90887699I=层相关逻辑
 * 1  @return {*}
 */
async function processController({
  controllerDir,
  app,
  plugins
}: {
  controllerDir: string;
  app: Koa;
  plugins: any[];
}) {
  if (fs.existsSync(controllerDir)) {
    let time = Date.now();
    console.log('开始扫描 controller 目录');
    await traverseController(plugins);
    console.log(`扫描 controller 目录完成,耗时 ${Date.now() - time} ms`);
  }
  /**
   * @description: 遍历每一个 controller 文件
   * @return {*}
   */
  async function traverseController(plugins: any[]) {
    for (let controllerFileName of fs.readdirSync(controllerDir)) {
      const fileName = path.join(controllerDir, controllerFileName);
      const controller = (await import(fileName))?.default;
      if (typeof controller !== 'function') {
        throw new Error(
          'controller 目录中的文件必须被 export default 导出一个 class'
        );
      }
      await initController({
        controller,
        controllerFileName,
        plugins,
        controllerDir
      });
    }
  }

  async function initController({
    controller,
    controllerFileName,
    plugins,
    controllerDir
  }: {
    controller: Function;
    controllerFileName: string;
    plugins: any[];
    controllerDir: string;
  }) {
    const metadata = Reflect.getMetadata(CONTROLLER_KEY, controller);
    const fileName = controllerFileName.split('.')[0];

    await lifecycleListener(plugins, 'traverseController', {
      controller,
      fileName,
      controllerDir
    });

    const { router } = controller.prototype;
    router.prefix(metadata.path);
    app.use(router.routes());
    app.use(router.allowedMethods());
    Reflect.construct(controller, []);
  }
}
/**
 * @description: 处理整个 server 层相关逻辑
 * @param {string} ServerDir
 * @param {string} typingAbsoluteDir
 * @return {*}
 */
async function processServer(serverDir: string, plugins: any[]) {
  let time = Date.now();
  console.log('开始扫描 server 目录');
  await traverseServer();
  console.log(`扫描 server 目录完成,耗时 ${Date.now() - time} ms`);
  /**
   * @description: 遍历每一个 server 文件
   * @return {*}
   */
  async function traverseServer() {
    for (let serverFileName of fs.readdirSync(serverDir)) {
      const name = path.join(serverDir, serverFileName);
      const server = (await import(name))?.default;
      if (typeof server !== 'function') {
        throw new Error('server 必须通过 export default 导出一个 class');
      }
      let fileName = serverFileName.split('.')?.[0];
      //@ts-ignore
      Server.prototype['app'][fileName] = new server();
      await lifecycleListener(plugins, 'traverseServer', {
        fileName,
        serverDir
      });
    }
  }
}

/**
 * @description: 处理 model 层的逻辑
 * @return {*}
 */
async function processModel({
  dbConfig,
  plugins,
  modelDir
}: {
  dbConfig: ILoad['dbConfig'];
  plugins: any[];
  modelDir: string;
}) {
  let time = Date.now();
  console.log('开始初始化数据库');
  plugins.forEach((plugin) => {
    plugin.beforeProcessDb();
  });

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

  await traverseModel();

  await initSeq(s);
  console.log(`数据库初始完成,耗时 ${Date.now() - time} ms`);
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
      await processModelItem(model, model, modelDir);
    }
  }

  async function processModelItem(
    modelName: string,
    modelDir: string,
    model: any
  ) {
    let fileName = modelName.split('.')?.[0];
    await lifecycleListener(plugins, 'traverseModel', {
      fileName,
      model,
      modelDir
    });
    //@ts-ignore
    Server.prototype['table'][fileName] = s.define(underline(fileName), model);
    is_stress &&
      //@ts-ignore
      (Server.prototype['table'][fileName]['stress'] = s.define(
        `${underline(fileName)}_stress`,
        model
      ));
  }
}

export async function lifecycleListener(
  plugins: any[],
  lifeCycle: string,
  config?: Record<string, any>
) {
  for (let plugin of plugins) {
    await plugin?.[lifeCycle]?.(config);
  }
}
