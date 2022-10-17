"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["ServiceError"] = 500] = "ServiceError";
    ErrorCode[ErrorCode["ParameterError"] = 422] = "ParameterError";
})(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
