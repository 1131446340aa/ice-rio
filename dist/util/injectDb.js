"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectDB = void 0;
const koa_1 = __importDefault(require("koa"));
const InjectDB = (modelKey) => {
    return (target, key) => {
        target[key] = koa_1.default.prototype[modelKey];
    };
};
exports.InjectDB = InjectDB;
