"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seq = exports.ErrorCode = exports.DataTypes = exports.Model = void 0;
const sequelize_1 = __importDefault(require("sequelize"));
var sequelize_2 = require("sequelize");
Object.defineProperty(exports, "Model", { enumerable: true, get: function () { return sequelize_2.Model; } });
Object.defineProperty(exports, "DataTypes", { enumerable: true, get: function () { return sequelize_2.DataTypes; } });
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["ServiceError"] = 500] = "ServiceError";
    ErrorCode[ErrorCode["ParameterError"] = 422] = "ParameterError";
})(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
exports.seq = sequelize_1.default;
