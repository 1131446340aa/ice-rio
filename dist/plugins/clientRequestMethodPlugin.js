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
exports.ClientRequestMethodPlugin = void 0;
const basePlugin_1 = require("./basePlugin");
const rio_fs_1 = require("../util/rio-fs");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const controller_1 = require("../lib/controller");
const constants_1 = require("../util/constants");
const ws_1 = __importDefault(require("ws"));
const rootDir = process.cwd();
const controllerMethodsMapDir = path_1.default.join(rootDir, '/__autoGenerate__/autoGenerateControllerMethods');
const serverJSONAbsoluteDir = path_1.default.join(rootDir, '/__autoGenerate__/serverJSON');
const controllerMethodsMapFile = controllerMethodsMapDir + '/index.ts';
let iceFs = new rio_fs_1.IceFs();
class ClientRequestMethodPlugin extends basePlugin_1.BasePlugin {
    constructor() {
        super(...arguments);
        this.clientRequestMethod = {};
    }
    async beforeProcessModel() {
        iceFs.makeDir(serverJSONAbsoluteDir);
        iceFs.deleteAllFile(serverJSONAbsoluteDir);
    }
    async traverseController(config) {
        const { controller } = config;
        const metadata = Reflect.getMetadata(controller_1.CONTROLLER_KEY, controller);
        this.clientRequestMethod[controller.name] = {};
        (this.env === 'prod'
            ? (await Promise.resolve().then(() => __importStar(require(controllerMethodsMapFile.slice(0, -3))))).default
            : constants_1.controllerMethodsMap)
            .get(controller.prototype)
            .forEach((value, methodName) => {
            var _a;
            this.clientRequestMethod[controller.name][methodName] = {
                body: {},
                headers: {},
                returnType: value.returnType,
                method: value.methodDescription.method,
                routerName: value.methodDescription.path,
                params: {},
                query: {},
                path: metadata.path
            };
            let v = this.clientRequestMethod[controller.name][methodName];
            (_a = value === null || value === void 0 ? void 0 : value.params) === null || _a === void 0 ? void 0 : _a.forEach((i) => {
                i.decorateValue === constants_1.ALL
                    ? (v[i.decorateType.toLowerCase()] = Object.assign(Object.assign({}, v[i.decorateType.toLowerCase()]), value.paramsType[i.name]))
                    : (v[i.decorateType.toLowerCase()][i.name] =
                        value.paramsType[i.name]);
            });
        });
    }
    async afterProcessController() {
        fs_1.default.writeFileSync(path_1.default.join(serverJSONAbsoluteDir, './serverJSON.json'), JSON.stringify(this.clientRequestMethod));
    }
    async beforeListen(config) {
        if (this.env === 'build')
            return;
        const { server } = config;
        const WebSocketApi = (wss) => {
            wss.on('connection', function connection(ws) {
                const serverJSONAbsoluteDir = path_1.default.join(rootDir, '/__autoGenerate__/serverJSON/serverJSON.json');
                ws.send(String(fs_1.default.readFileSync(serverJSONAbsoluteDir)));
            });
        };
        const wss = new ws_1.default.Server({ server, path: '/websockets' });
        WebSocketApi(wss);
    }
}
exports.ClientRequestMethodPlugin = ClientRequestMethodPlugin;
