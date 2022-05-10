"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.options = exports.patch = exports.put = exports.head = exports.get = exports.post = exports.Params = exports.Body = exports.Query = void 0;
const koa_router_1 = __importDefault(require("koa-router"));
const constants_1 = require("../util/constants");
const getParamNames_1 = require("../util/getParamNames");
const getControllerResult_1 = require("../util/getControllerResult");
const controllerMap = new WeakMap();
function createParamMapping(p) {
    return (attr) => function (_, key, index) {
        let { result: paramSet } = getControllerResult_1.getControllerResult(controllerMap, _, key, []);
        const originParamNames = getParamNames_1.getParamNames(_[key]);
        paramSet[index] = new createRouteParam(p, attr || originParamNames[index]);
        let { result: paramsIdxSet } = getControllerResult_1.getControllerResult(constants_1.controllerMethodsParamsIdxMap, _, key, []);
        let { result: apiDocMethodParams } = getControllerResult_1.getControllerResult(constants_1.controllerMethodsApiDocMap, _, key, {});
        paramsIdxSet[index] = originParamNames[index];
        apiDocMethodParams.routerName = key;
        return _;
    };
}
exports.Query = createParamMapping('Query');
exports.Body = createParamMapping('Body');
exports.Params = createParamMapping('Params');
function initMethod() {
    return ['post', 'get', 'head', 'put', 'patch', 'options'].reduce((prev, curr) => {
        prev[curr] = function (path, config) {
            return function (target, key, descriptor) {
                if (!target['router'])
                    target['router'] = new koa_router_1.default();
                path = path || `/${key}`;
                let { result: apiDocMethodParams } = getControllerResult_1.getControllerResult(constants_1.controllerMethodsApiDocMap, target, key, {});
                apiDocMethodParams.path = path;
                apiDocMethodParams.method = curr;
                const fn = function (...args) {
                    var _a;
                    const [ctx, next] = args;
                    const paramSet = ((_a = controllerMap.get(target)) === null || _a === void 0 ? void 0 : _a.get(key)) || [];
                    const finalParams = new Array(target[key].OriginLength)
                        .fill(1)
                        .reduce((prev, curr, index) => {
                        var _a;
                        const p = paramSet[index];
                        const params = ctx.request[(_a = p === null || p === void 0 ? void 0 : p.type) === null || _a === void 0 ? void 0 : _a.toLocaleLowerCase()] || {};
                        prev.push((p === null || p === void 0 ? void 0 : p.value) ? (p.value === constants_1.All ? params : params[p.value]) : ctx);
                        return prev;
                    }, []);
                    let res = Promise.resolve(target[key].call(target, ...finalParams)).then((r) => {
                        ctx.body = r;
                        next();
                    });
                    return res;
                };
                let middleWare = (config === null || config === void 0 ? void 0 : config.middleWare) || [];
                let router = target['router'];
                function runMiddleWare() {
                    while (middleWare.length) {
                        let cur = middleWare.shift();
                        router = router[curr](path, cur);
                    }
                    router === null || router === void 0 ? void 0 : router[curr](path, fn);
                }
                runMiddleWare();
            };
        };
        return prev;
    }, {});
}
_a = initMethod(), exports.post = _a.post, exports.get = _a.get, exports.head = _a.head, exports.put = _a.put, exports.patch = _a.patch, exports.options = _a.options;
class createRouteParam {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}
