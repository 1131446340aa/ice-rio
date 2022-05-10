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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectDB = exports.DataTypes = exports.Model = exports.All = exports.HTTPError = void 0;
class HTTPError extends Error {
    constructor(message, status) {
        super();
        this.message = message;
        this.status = status;
    }
}
exports.HTTPError = HTTPError;
var constants_1 = require("./constants");
Object.defineProperty(exports, "All", { enumerable: true, get: function () { return constants_1.All; } });
var enum_1 = require("./enum");
Object.defineProperty(exports, "Model", { enumerable: true, get: function () { return enum_1.Model; } });
Object.defineProperty(exports, "DataTypes", { enumerable: true, get: function () { return enum_1.DataTypes; } });
var injectDb_1 = require("./injectDb");
Object.defineProperty(exports, "InjectDB", { enumerable: true, get: function () { return injectDb_1.InjectDB; } });
__exportStar(require("./require"), exports);
