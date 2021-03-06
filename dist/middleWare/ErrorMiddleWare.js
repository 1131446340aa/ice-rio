"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMiddleware = void 0;
const await_to_js_1 = __importDefault(require("await-to-js"));
const enum_1 = require("../util/enum");
function ErrorMiddleware() {
    return async (ctx, next) => {
        const [error] = await await_to_js_1.default(next());
        if (error) {
            ctx.status = error.status || enum_1.ErrorCode.ServiceError;
            ctx.message = error.message;
        }
    };
}
exports.ErrorMiddleware = ErrorMiddleware;
