"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseInterfacePlugin = void 0;
const babel_1 = require("../lib/babel");
const basePlugin_1 = require("./basePlugin");
class ParseInterfacePlugin extends basePlugin_1.BasePlugin {
    constructor(interfaceFileName) {
        super();
        this.interfaceFileName = interfaceFileName;
    }
    async beforeProcessModel() {
        if (this.env !== 'prod') {
            console.log(`开始处理 ${this.interfaceFileName} 文件`);
            let date = Date.now();
            (0, babel_1.getValidatedTypeStore)(this.interfaceFileName);
            console.log(`处理 ${this.interfaceFileName} 文件完成,耗时 ${Date.now() - date} ms`);
        }
    }
}
exports.ParseInterfacePlugin = ParseInterfacePlugin;
