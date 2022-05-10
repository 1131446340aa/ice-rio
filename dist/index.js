"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
exports.HttpServer = void 0;
const koa_bodyparser_1 = __importDefault(require("koa-bodyparser"));
const koa_1 = __importDefault(require("koa"));
const load_1 = require("./lib/load");
class HttpServer extends koa_1.default {
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
        this.use(koa_bodyparser_1.default());
    }
    async load({ dir, initDb = false, apiDoc = false, dbConfig = {}, apiDocDir = '', env = 'dev' }) {
        var _a, _b, _c;
        this.loadConfig = { dir,
            initDb,
            apiDoc,
            dbConfig,
            apiDocDir,
            env };
        await load_1.load(this, { dir, initDb, dbConfig, apiDoc, apiDocDir, env });
        (_c = (_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.hooks) === null || _b === void 0 ? void 0 : _b.afterCreated) === null || _c === void 0 ? void 0 : _c.forEach((i) => {
            this.use(i);
        });
    }
    listen(...config) {
        if (this.loadConfig.env === 'build') {
            return this;
        }
        super.listen(...config);
        return this;
    }
}
exports.HttpServer = HttpServer;
__exportStar(require("./lib/controller"), exports);
__exportStar(require("./lib/initMethod"), exports);
__exportStar(require("./middleWare"), exports);
__exportStar(require("./util"), exports);
