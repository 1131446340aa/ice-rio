"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IceFs = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = require("path");
class IceFs {
    deleteAllFile(dir) {
        for (let i of fs_1.default.readdirSync(dir)) {
            fs_1.default.unlinkSync((0, path_1.join)(dir, i));
        }
    }
    makeDir(dir) {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir);
        }
    }
    BeforeAppend(dir, content) {
        fs_1.default.writeFileSync(dir, `${content}
${fs_1.default.readFileSync(dir)}`);
    }
}
exports.IceFs = IceFs;
