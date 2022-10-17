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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = exports.IceRio = void 0;
const koa_bodyparser_1 = __importDefault(require("koa-bodyparser"));
const koa_1 = __importDefault(require("koa"));
const load_1 = require("./lib/load");
const cluster_1 = __importDefault(require("cluster"));
const http_1 = require("http");
class IceRio extends koa_1.default {
    constructor(config) {
        super();
        this.config = config;
        this.loadConfig = {};
        this.init();
    }
    init() {
        var _a, _b, _c;
        (_c = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.hooks) === null || _b === void 0 ? void 0 : _b.beforeCreated) === null || _c === void 0 ? void 0 : _c.forEach((i) => {
            this.use(i);
        });
        this.use((0, koa_bodyparser_1.default)());
    }
    async load({ initDb = false, enableApiDoc = false, appDir, dbConfig = {}, apiDocDir = '', env = 'dev', viewsConfig = {}, worker = 1, redisConfig = {}, }) {
        var _a, _b, _c;
        this.loadConfig = {
            initDb,
            enableApiDoc,
            dbConfig,
            apiDocDir,
            appDir,
            env,
            viewsConfig,
            worker,
        };
        await (0, load_1.load)(this, { initDb, dbConfig, enableApiDoc, apiDocDir, env, appDir, viewsConfig, redisConfig, plugins: this.config.plugins });
        (_c = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.hooks) === null || _b === void 0 ? void 0 : _b.afterCreated) === null || _c === void 0 ? void 0 : _c.forEach((i) => {
            this.use(i);
        });
    }
    async listen(...config) {
        var _a;
        const server = (0, http_1.createServer)(this.callback());
        await (0, load_1.lifecycleListener)(this.config.plugins, 'beforeListen', { server });
        if (this.loadConfig.env === 'build')
            return this;
        ((_a = this.loadConfig) === null || _a === void 0 ? void 0 : _a.worker) === 1 ? server.listen(...config) : this.createCluster(server, config);
        return this;
    }
    createCluster(server, config) {
        var _a;
        if (cluster_1.default.isMaster) {
            this.loadConfig.worker = Math.max(((_a = this.loadConfig) === null || _a === void 0 ? void 0 : _a.worker) || 1, require('os').cpus().length);
            for (let i = 0; i < this.loadConfig.worker; i++) {
                cluster_1.default.fork();
            }
            cluster_1.default.on('exit', (worker) => {
                console.log(`工作进程 ${worker.process.pid} 已退出`);
                cluster_1.default.fork();
            });
        }
        else {
            server.listen(...config);
            console.log(`工作进程 ${process.pid} 已启动`);
        }
    }
}
exports.IceRio = IceRio;
__exportStar(require("./lib/controller"), exports);
__exportStar(require("./middleWare"), exports);
__exportStar(require("./util"), exports);
__exportStar(require("./lib/initMethod"), exports);
var server_1 = require("./lib/server");
Object.defineProperty(exports, "Server", { enumerable: true, get: function () { return server_1.Server; } });
__exportStar(require("./lib/createRequestServer"), exports);
__exportStar(require("./plugins/apiDocPlugin"), exports);
__exportStar(require("./plugins/parsePlugin"), exports);
__exportStar(require("./plugins/parseInterfacePlugin"), exports);
__exportStar(require("./plugins/clientRequestMethodPlugin"), exports);
__exportStar(require("./plugins/generateTypePlugin"), exports);
__exportStar(require("./plugins/basePlugin"), exports);
