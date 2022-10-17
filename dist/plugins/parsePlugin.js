"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePlugin = void 0;
const rio_fs_1 = require("../util/rio-fs");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let iceFs = new rio_fs_1.IceFs();
const babel_1 = require("../lib/babel");
const constants_1 = require("../util/constants");
const basePlugin_1 = require("./basePlugin");
const rootDir = process.cwd();
const controllerMethodsMapDir = path_1.default.join(rootDir, '/__autoGenerate__/autoGenerateControllerMethods');
const controllerMethodsMapFile = controllerMethodsMapDir + '/index.ts';
class parsePlugin extends basePlugin_1.BasePlugin {
    constructor() {
        super(...arguments);
        this.result = '';
    }
    async beforeProcessModel() {
        if (this.env === 'build') {
            iceFs.makeDir(controllerMethodsMapDir);
            iceFs.deleteAllFile(controllerMethodsMapDir);
            this.result += `const controllerMethodsMap = new Map
      `;
        }
    }
    async traverseController(config) {
        var _a;
        const { controller, controllerDir, fileName } = config;
        controller.prototype.__env__ = this.env;
        controller.prototype.__dir__ = controllerMethodsMapFile.slice(0, -3);
        if (this.env !== 'prod') {
            const ast = (0, babel_1.parse)(path_1.default.join(controllerDir, fileName));
            (0, babel_1.generateFinalParams)(ast, controller.prototype);
        }
        if (this.env === 'build') {
            this.result =
                `import ${controller.name} from '${path_1.default
                    .relative(controllerMethodsMapDir, path_1.default.join(controllerDir, fileName))}'
          ` + this.result;
        }
        this.result += `const ${fileName}Map = new Map
    `;
        (_a = constants_1.controllerMethodsMap.get(controller.prototype)) === null || _a === void 0 ? void 0 : _a.forEach((value, key) => {
            this.result += `${fileName}Map.set('${String(key)}',${JSON.stringify(value)})
`;
            this.result += `controllerMethodsMap.set(${controller.name}.prototype,${fileName}Map)
`;
        });
    }
    async afterProcessController() {
        if (this.env === 'build') {
            this.result += `export default controllerMethodsMap`;
            fs_1.default.writeFileSync(controllerMethodsMapFile, this.result);
        }
    }
}
exports.parsePlugin = parsePlugin;
