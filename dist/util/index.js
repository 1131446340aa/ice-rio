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
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectServer = exports.InjectDB = exports.ALL = exports.underline = exports.HTTPError = void 0;
class HTTPError extends Error {
    constructor(message, status) {
        super();
        this.message = message;
        this.status = status;
    }
}
exports.HTTPError = HTTPError;
function underline(str) {
    return str.replace(/\B([A-Z])/g, '_$1').toLowerCase();
}
exports.underline = underline;
var constants_1 = require("./constants");
Object.defineProperty(exports, "ALL", { enumerable: true, get: function () { return constants_1.ALL; } });
var injectDb_1 = require("./injectDb");
Object.defineProperty(exports, "InjectDB", { enumerable: true, get: function () { return injectDb_1.InjectDB; } });
__exportStar(require("./render"), exports);
__exportStar(require("./require"), exports);
__exportStar(require("./logId"), exports);
__exportStar(require("./time"), exports);
var injectServer_1 = require("./injectServer");
Object.defineProperty(exports, "InjectServer", { enumerable: true, get: function () { return injectServer_1.InjectServer; } });
__exportStar(require("sequelize"), exports);
