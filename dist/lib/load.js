"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lifecycleListener = exports.load = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
require("reflect-metadata");
const controller_1 = require("./controller");
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../util/sequelize"));
const rio_fs_1 = require("../util/rio-fs");
const koa_views_1 = __importDefault(require("koa-views"));
const server_1 = require("./server");
const util_1 = require("../util");
const basePlugin_1 = require("../plugins/basePlugin");
const rootDir = process.cwd();
let iceFs = new rio_fs_1.IceFs();
async function load(app, { initDb = false, dbConfig, env, appDir = '', viewsConfig, plugins }) {
    const appDirAbsolutePath = path_1.default.join(rootDir, appDir);
    const controllerDir = appDirAbsolutePath + '/controller';
    const modelDir = appDirAbsolutePath + '/model';
    const ServerDir = appDirAbsolutePath + '/server';
    const viewsDir = appDirAbsolutePath + '/views';
    iceFs.makeDir(path_1.default.join(rootDir, '/__autoGenerate__'));
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
    function init() {
        basePlugin_1.BasePlugin.prototype.env = env;
        basePlugin_1.BasePlugin.prototype.app = app;
        app.use(require('koa-static')(viewsDir));
        app.use((0, koa_views_1.default)(viewsDir, viewsConfig));
        iceFs.makeDir(path_1.default.join(rootDir, '/__autoGenerate__'));
    }
}
exports.load = load;
async function processController({ controllerDir, app, plugins }) {
    if (fs_1.default.existsSync(controllerDir)) {
        let time = Date.now();
        console.log('开始扫描 controller 目录');
        await traverseController(plugins);
        console.log(`扫描 controller 目录完成,耗时 ${Date.now() - time} ms`);
    }
    async function traverseController(plugins) {
        var _a;
        for (let controllerFileName of fs_1.default.readdirSync(controllerDir)) {
            const fileName = path_1.default.join(controllerDir, controllerFileName);
            const controller = (_a = (await Promise.resolve().then(() => __importStar(require(fileName))))) === null || _a === void 0 ? void 0 : _a.default;
            if (typeof controller !== 'function') {
                throw new Error('controller 目录中的文件必须被 export default 导出一个 class');
            }
            await initController({
                controller,
                controllerFileName,
                plugins,
                controllerDir
            });
        }
    }
    async function initController({ controller, controllerFileName, plugins, controllerDir }) {
        const metadata = Reflect.getMetadata(controller_1.CONTROLLER_KEY, controller);
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
async function processServer(serverDir, plugins) {
    let time = Date.now();
    console.log('开始扫描 server 目录');
    await traverseServer();
    console.log(`扫描 server 目录完成,耗时 ${Date.now() - time} ms`);
    async function traverseServer() {
        var _a, _b;
        for (let serverFileName of fs_1.default.readdirSync(serverDir)) {
            const name = path_1.default.join(serverDir, serverFileName);
            const server = (_a = (await Promise.resolve().then(() => __importStar(require(name))))) === null || _a === void 0 ? void 0 : _a.default;
            if (typeof server !== 'function') {
                throw new Error('server 必须通过 export default 导出一个 class');
            }
            let fileName = (_b = serverFileName.split('.')) === null || _b === void 0 ? void 0 : _b[0];
            server_1.Server.prototype['app'][fileName] = new server();
            await lifecycleListener(plugins, 'traverseServer', {
                fileName,
                serverDir
            });
        }
    }
}
async function processModel({ dbConfig, plugins, modelDir }) {
    let time = Date.now();
    console.log('开始初始化数据库');
    plugins.forEach((plugin) => {
        plugin.beforeProcessDb();
    });
    const { port, host, database, username, password, dialect, is_stress = false } = dbConfig;
    const s = new sequelize_1.Sequelize(database, username, password, {
        host,
        dialect,
        port
    });
    await traverseModel();
    await (0, sequelize_2.default)(s);
    console.log(`数据库初始完成,耗时 ${Date.now() - time} ms`);
    async function traverseModel() {
        var _a;
        for (let modelName of fs_1.default.readdirSync(modelDir)) {
            const model = (_a = (await Promise.resolve().then(() => __importStar(require(path_1.default.join(modelDir, modelName)))))) === null || _a === void 0 ? void 0 : _a.default;
            if (typeof model !== 'object') {
                throw new Error('model 层的文件必须使用 export default 导出一个符合 sequelize 建表规范的对象');
            }
            await processModelItem(model, model, modelDir);
        }
    }
    async function processModelItem(modelName, modelDir, model) {
        var _a;
        let fileName = (_a = modelName.split('.')) === null || _a === void 0 ? void 0 : _a[0];
        await lifecycleListener(plugins, 'traverseModel', {
            fileName,
            model,
            modelDir
        });
        server_1.Server.prototype['table'][fileName] = s.define((0, util_1.underline)(fileName), model);
        is_stress &&
            (server_1.Server.prototype['table'][fileName]['stress'] = s.define(`${(0, util_1.underline)(fileName)}_stress`, model));
    }
}
async function lifecycleListener(plugins, lifeCycle, config) {
    var _a;
    for (let plugin of plugins) {
        await ((_a = plugin === null || plugin === void 0 ? void 0 : plugin[lifeCycle]) === null || _a === void 0 ? void 0 : _a.call(plugin, config));
    }
}
exports.lifecycleListener = lifecycleListener;
