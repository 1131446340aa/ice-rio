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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.required = exports.requireArrayString = exports.requireInt = exports.validated = void 0;
const util_1 = require("../util");
const type_1 = require("./type");
const constants_1 = require("./constants");
const babel_1 = require("../lib/babel");
const validateMap = {};
function typedDecoratorFactory(validator) {
    return (_, key, index) => {
        var _a;
        const target = (_a = validateMap[key]) !== null && _a !== void 0 ? _a : [];
        target[index] = validator;
        validateMap[key] = target;
    };
}
function validated(_, key, descriptor) {
    const originalFn = descriptor.value;
    const length = _[key].length;
    descriptor.value = async function (...args) {
        var _a, _b, _c, _d, _e, _f;
        const validatorList = validateMap[key];
        if (validatorList) {
            for (let index = 0; index < args.length; index++) {
                const arg = args[index];
                const validator = validatorList[index];
                if (!validator)
                    continue;
                const { __env__, __dir__ } = _;
                let validatorParams = {};
                validatorParams =
                    __env__ === 'prod'
                        ? ((_b = (_a = (await Promise.resolve().then(() => __importStar(require(__dir__)))).default.get(_)) === null || _a === void 0 ? void 0 : _a.get(key)) === null || _b === void 0 ? void 0 : _b.paramsType) || {}
                        : ((_d = (_c = constants_1.controllerMethodsMap.get(_)) === null || _c === void 0 ? void 0 : _c.get(key)) === null || _d === void 0 ? void 0 : _d.paramsType) || {};
                const params = ((_f = (_e = constants_1.controllerMethodsMap.get(_)) === null || _e === void 0 ? void 0 : _e.get(key)) === null || _f === void 0 ? void 0 : _f.params) || [];
                const result = await validator(arg, params[index].name, validatorParams[params[index].name]);
                if (result) {
                    throw new util_1.HTTPError(typeof arg === 'object'
                        ? `Failed for parameter: ${result}`
                        : `Failed for parameter: ${result}`, type_1.ErrorCode.ParameterError);
                }
            }
        }
        return await originalFn.call(this, ...args);
    };
    descriptor.value.OriginLength = length;
}
exports.validated = validated;
function requireInt(i) {
    if (!Number.isInteger(i)) {
        return 'please input Int';
    }
    return '';
}
exports.requireInt = requireInt;
function requireArrayString(i, require = false) {
    if (!i && !require)
        return '';
    try {
        let arr = JSON.parse(i);
        if (Array.isArray(arr))
            return '';
        return 'Please enter an array string';
    }
    catch (error) {
        return error.message;
    }
}
exports.requireArrayString = requireArrayString;
function required(type) {
    return typedDecoratorFactory(async (query, paramsName, defaultType) => {
        function check(type, query, key = '') {
            function checkObject(type, query, key) {
                if (type.__optional__) {
                    if (query === undefined)
                        return '';
                }
                if (typeof query !== 'object') {
                    return `The type of verification parameter ${key} is an object,but the type of input is ${typeof query}, please check`;
                }
                for (let item of Object.keys(type)) {
                    let ret = check(type[item], query[item], key ? key + '.' + item : item);
                    if (ret)
                        return ret;
                }
                return '';
            }
            function checkOrdinaryType(type, query, key) {
                const index = type.indexOf('|');
                if (query === undefined) {
                    if (index === -1)
                        return `the Parameter ${key} is required,please verify the parameters`;
                    return '';
                }
                let validType = type
                    .split('|')
                    .filter((i) => i.trim() !== 'undefined')[0]
                    .trim();
                if (typeof query !== validType) {
                    return `the type of Parameter ${key} is ${validType},but the type of input is ${typeof query}, please verify the parameters`;
                }
                return '';
            }
            function checkFunction(type, query, key) {
                let ret = type(query);
                if (ret)
                    return `The parameter ${key} is a custom check,the error message is as follows:${ret},please verify the parameters`;
                return '';
            }
            function checkArrayType(type, query, key = '') {
                if (!Array.isArray(query)) {
                    return `The parameter ${key} is array,but the type of input is ${typeof query},please verify the parameters`;
                }
                if (type.__optional__) {
                    if (query === undefined)
                        return '';
                }
                return check(type.__value__, query[0], key + `[0]`);
            }
            if (type instanceof babel_1.CreateArrayType || type.__value__) {
                return checkArrayType(type, query, key);
            }
            if (typeof type === 'object') {
                return checkObject(type, query, key);
            }
            if (typeof type === 'function') {
                return checkFunction(type, query, key);
            }
            return checkOrdinaryType(type, query, key);
        }
        return check(type || defaultType, query, paramsName);
    });
}
exports.required = required;
