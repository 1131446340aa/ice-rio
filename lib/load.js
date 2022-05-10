"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
exports.load = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
require("reflect-metadata");
const koa_1 = __importDefault(require("koa"));
const controller_1 = require("./controller");
const sequelize_1 = require("sequelize");
const sequelize_2 = __importDefault(require("../util/sequelize"));
const babel_1 = require("../util/babel");
const constants_1 = require("../util/constants");
const generateApiDoc_1 = require("../util/generateApiDoc");
const koa_router_1 = __importDefault(require("koa-router"));
const views = require('koa-views');
async function load(app, { dir, initDb = false, apiDoc = false, apiDocDir, dbConfig, env }) {
    var _a, _b, _c;
    if (initDb) {
        const modelDir = dir + '/model';
        const { port, host, database, username, password, dialect } = dbConfig;
        const s = new sequelize_1.Sequelize(database, username, password, {
            host,
            dialect,
            port
        });
        for (let i of fs_1.default.readdirSync(modelDir)) {
            const model = (_a = (await Promise.resolve().then(() => __importStar(require(path_1.default.join(modelDir, i)))))) === null || _a === void 0 ? void 0 : _a.default;
            if (typeof model === 'object') {
                let fileName = (_b = i.split('.')) === null || _b === void 0 ? void 0 : _b[0];
                koa_1.default.prototype[fileName] = s.define(fileName, model);
            }
            else {
                throw new Error('it only allowed use export default a object in the files of model dir');
            }
        }
        await sequelize_2.default(s);
    }
    const requireMapDir = dir + '/autoGenerateRequire';
    const requireMapFile = requireMapDir + '/index.ts';
    const controllerDir = dir + '/controller';
    const apiDocAbsoluteDir = dir + '/apiDoc';
    if (env === 'build') {
        if (!fs_1.default.existsSync(requireMapDir)) {
            fs_1.default.mkdirSync(requireMapDir);
        }
        for (let i of fs_1.default.readdirSync(requireMapDir)) {
            fs_1.default.unlinkSync(path_1.default.join(requireMapDir, i));
        }
        if (!fs_1.default.existsSync(apiDocAbsoluteDir)) {
            fs_1.default.mkdirSync(apiDocAbsoluteDir);
        }
        for (let i of fs_1.default.readdirSync(apiDocAbsoluteDir)) {
            fs_1.default.unlinkSync(path_1.default.join(apiDocAbsoluteDir, i));
        }
        fs_1.default.writeFileSync(requireMapFile, `const requireMap = new Map
`);
    }
    if (fs_1.default.existsSync(controllerDir)) {
        for (let i of fs_1.default.readdirSync(controllerDir)) {
            const fileName = path_1.default.join(controllerDir, i);
            const controller = (_c = (await Promise.resolve().then(() => __importStar(require(fileName))))) === null || _c === void 0 ? void 0 : _c.default;
            if (typeof controller === 'function') {
                controller.prototype.__env__ = env;
                controller.prototype.__dir__ = requireMapFile.slice(0, -3);
                if (env !== 'prod') {
                    const ast = babel_1.parse(fileName);
                    babel_1.generateFinalParams(ast, controller.prototype, controllerDir);
                    if (env === 'build') {
                        fs_1.default.writeFileSync(requireMapFile, `import ${controller.name} from '../${path_1.default
                            .relative(dir, fileName)
                            .slice(0, -3)}'
${fs_1.default.readFileSync(requireMapFile)}`, {});
                        fs_1.default.appendFileSync(requireMapFile, `const ${i.slice(0, -3)}Map = new Map
`);
                        constants_1.typeMap.get(controller.prototype).forEach((value, key) => {
                            fs_1.default.appendFileSync(requireMapFile, `${i.slice(0, -3)}Map.set('${key}',${JSON.stringify(value)})
`);
                        });
                        fs_1.default.appendFileSync(requireMapFile, `requireMap.set(${controller.name}.prototype,${i.slice(0, -3)}Map)
`);
                    }
                }
                const metadata = Reflect.getMetadata(controller_1.CONTROLLER_KEY, controller);
                const { router } = controller.prototype;
                router.prefix(metadata.path);
                app.use(router.routes());
                app.use(router.allowedMethods());
                if (env === 'build' && apiDoc) {
                    const controllerMethod = constants_1.controllerMethodsApiDocMap.get(controller.prototype) || new Map();
                    let paramsTypeMap = constants_1.typeMap.get(controller.prototype);
                    let returnTypeMap = constants_1.controllerMethodsReturnMap.get(controller.prototype);
                    let descprititionMap = constants_1.controllerMethodsDescriptionMap.get(controller.prototype);
                    controllerMethod.forEach((v) => {
                        v.controller = metadata.path;
                        v.fileName = i.split('.')[0];
                        if (!v.params)
                            v.params = [];
                        let paramsMap = (paramsTypeMap === null || paramsTypeMap === void 0 ? void 0 : paramsTypeMap.get(v.routerName)) || {};
                        let returnResult = (returnTypeMap === null || returnTypeMap === void 0 ? void 0 : returnTypeMap.get(v.routerName)) || {
                            error: `please input return of ${v.controller}.${v.routerName}`
                        };
                        let descpritition = (descprititionMap === null || descprititionMap === void 0 ? void 0 : descprititionMap.get(v.routerName)) ||
                            `please input @descpritition of ${v.controller}.${v.routerName}`;
                        Object.keys(paramsMap).forEach((i, index) => {
                            v.params.push({
                                name: i,
                                value: paramsMap[i]
                            });
                        });
                        v.returns = { name: v.path, value: returnResult };
                        v.descpritition = descpritition;
                        const writeDir = path_1.default.join(apiDocAbsoluteDir, v.fileName + '.ts');
                        let ret = generateApiDoc_1.generateApiDoc(v);
                        fs_1.default.appendFileSync(writeDir, ret);
                    });
                }
                Reflect.construct(controller, []);
            }
            else {
                throw new Error('it only allowed use export default a class in the files of controller dir');
            }
        }
        if (env === 'build') {
            fs_1.default.appendFileSync(requireMapFile, `export default requireMap`);
        }
    }
    if (apiDoc && env !== 'build' && apiDocDir) {
        let router = new koa_router_1.default();
        app.use(require('koa-static')(path_1.default.join(dir, apiDocDir)));
        try {
            app.use(views(path_1.default.join(dir, apiDocDir), {}));
            router.get('/', async (ctx) => {
                await ctx.render('./index.html');
            });
            app.use(router.routes());
            app.use(router.allowedMethods());
        }
        catch (error) {
            console.error(error.message);
        }
    }
}
exports.load = load;
