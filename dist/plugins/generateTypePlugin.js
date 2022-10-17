"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateTypePlugin = void 0;
const path_1 = __importDefault(require("path"));
const rio_fs_1 = require("../util/rio-fs");
const fs_1 = __importDefault(require("fs"));
const basePlugin_1 = require("./basePlugin");
const rootDir = process.cwd();
const typingAbsoluteDir = path_1.default.join(rootDir, '/__autoGenerate__/typings');
let iceFs = new rio_fs_1.IceFs();
class GenerateTypePlugin extends basePlugin_1.BasePlugin {
    constructor() {
        super(...arguments);
        this.result = '';
        this.tableAttr = '';
        this.serverAttr = '';
        this.DBStr = '';
        this.ServerStr = '';
    }
    async beforeProcessModel() {
        iceFs.makeDir(typingAbsoluteDir);
        iceFs.deleteAllFile(typingAbsoluteDir);
        this.result += `import {Model,ModelCtor} from 'ice-rio';
    `;
    }
    async traverseModel(config) {
        const { fileName } = config;
        this.tableAttr += `${fileName}:ModelCtor<Model<Record<any,any>>>;
    `;
    }
    async beforeProcessServer() {
        this.DBStr += `export interface IceServerTable{
      ${this.tableAttr}
    }`;
    }
    async traverseServer(config) {
        const { fileName, serverDir } = config;
        this.result += `import ${fileName} from '${path_1.default.join(serverDir, fileName)}';
`;
        this.serverAttr += `${fileName}: ${fileName};
`;
    }
    async beforeProcessController() {
        this.ServerStr += `export interface IceServerApp{
      ${this.serverAttr}
    }`;
    }
    async afterProcessController() {
        this.result += `
    declare module 'ice-rio' {
      ${this.ServerStr}
      ${this.DBStr}
    }`;
        fs_1.default.writeFileSync(path_1.default.join(typingAbsoluteDir, './index.ts'), this.result);
    }
}
exports.GenerateTypePlugin = GenerateTypePlugin;
