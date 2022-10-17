"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiDocPlugin = void 0;
const basePlugin_1 = require("./basePlugin");
const rio_fs_1 = require("../util/rio-fs");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const controller_1 = require("../lib/controller");
const constants_1 = require("../util/constants");
const generateApiDoc_1 = require("../util/generateApiDoc");
const rootDir = process.cwd();
const apiDocAbsoluteDir = path_1.default.join(rootDir, '/__autoGenerate__/apiDoc');
let iceFs = new rio_fs_1.IceFs();
class ApiDocPlugin extends basePlugin_1.BasePlugin {
    constructor(dir) {
        super();
        this.dir = dir;
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
    async traverseController(config) {
        if (this.env !== 'build')
            return;
        const { controller, fileName } = config;
        const metadata = Reflect.getMetadata(controller_1.CONTROLLER_KEY, controller);
        const controllerMethods = constants_1.controllerMethodsMap.get(controller.prototype) || new Map();
        controllerMethods.forEach((v, key) => {
            let u = controllerMethods === null || controllerMethods === void 0 ? void 0 : controllerMethods.get(key);
            u.methodDescription.controller = metadata.path;
            u.methodDescription.fileName = fileName;
            let typeMap = u.params.reduce((prev, curr) => {
                prev[curr.name] = curr.decorateType;
                return prev;
            }, {});
            if (!u.methodDescription.params)
                u.methodDescription.params = [];
            let paramsType = (u === null || u === void 0 ? void 0 : u.paramsType) || {};
            let returnResult = u.returnType || {};
            Object.keys(paramsType).forEach((i) => {
                u.methodDescription.params.push({
                    name: i,
                    value: paramsType[i],
                    type: typeMap[i]
                });
            });
            if (u.methodDescription.params.length) {
                u.methodDescription.returns = {
                    name: u.methodDescription.path,
                    value: returnResult
                };
                const writeDir = path_1.default.join(apiDocAbsoluteDir, u.methodDescription.fileName + '.ts');
                let ret = (0, generateApiDoc_1.generateApiDoc)(u.methodDescription);
                fs_1.default.writeFileSync(writeDir, ret);
            }
        });
    }
}
exports.ApiDocPlugin = ApiDocPlugin;
