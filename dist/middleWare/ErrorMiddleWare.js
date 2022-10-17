"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMiddleware = void 0;
const await_to_js_1 = __importDefault(require("await-to-js"));
const type_1 = require("../util/type");
function ErrorMiddleware() {
    return async (ctx, next) => {
        const [error] = await (0, await_to_js_1.default)(next());
        if (error) {
            console.log(error.message);
            ctx.status = error.status || type_1.ErrorCode.ServiceError;
            ctx.message = error.message;
        }
    };
}
exports.ErrorMiddleware = ErrorMiddleware;
