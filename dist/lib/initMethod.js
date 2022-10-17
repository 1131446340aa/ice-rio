"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Delete = exports.Option = exports.Patch = exports.Put = exports.Head = exports.Get = exports.Post = exports.Headers = exports.Session = exports.Cookie = exports.Params = exports.Body = exports.Query = void 0;
const koa_router_1 = __importDefault(require("koa-router"));
const constants_1 = require("../util/constants");
const getParamNames_1 = require("../util/getParamNames");
const render_1 = require("../util/render");
const util_1 = require("../util");
const server_1 = require("./server");
function createParamMapping(p) {
    return (attr) => function (_, key, index) {
        const originParamNames = (0, getParamNames_1.getParamNames)(_[key]);
        let controller = constants_1.controllerMethodsMap.get(_);
        !controller && constants_1.controllerMethodsMap.set(_, (controller = new Map()));
        let methods = controller.get(key);
        if (!methods)
            controller.set(key, (methods = {
                params: [],
                paramsType: {},
                methodDescription: {
                    description: `please input @description of ${_.constructor.name}.${key}`
                }
            }));
        if (!methods.params[index])
            methods.params[index] = {};
        methods.params[index].decorateType = p;
        methods.params[index].name =
            attr === constants_1.ALL
                ? originParamNames[index]
                : attr || originParamNames[index];
        methods.params[index].decorateValue = attr;
        if (attr === constants_1.ALL && methods.params[index].decorateType === 'Params') {
            throw new Error('The Params do not support ALL');
        }
        methods['methodDescription'].routerName = key;
        return _;
    };
}
exports.Query = createParamMapping('Query');
exports.Body = createParamMapping('Body');
exports.Params = createParamMapping('Params');
exports.Cookie = createParamMapping('Cookie');
exports.Session = createParamMapping('Session');
exports.Headers = createParamMapping('Headers');
function initMethod() {
    return ['Post', 'Get', 'Head', 'Put', 'Patch', 'Option', 'Delete'].reduce((prev, curr) => {
        prev[curr] = function (path, config) {
            return method;
            function method(target, key) {
                const fn = function (...args) {
                    var _a, _b;
                    const [ctx, next] = args;
                    ctx.logId = (0, util_1.generateLogId)();
                    server_1.Server.initContext(ctx);
                    const paramSet = ((_b = (_a = constants_1.controllerMethodsMap.get(target)) === null || _a === void 0 ? void 0 : _a.get(key)) === null || _b === void 0 ? void 0 : _b.params) || [];
                    const finalParams = getFinalParams({ target, key, paramSet, ctx });
                    let res = Promise.resolve(target[key].call(new target.constructor(), ...finalParams)).then(async (r) => {
                        r instanceof render_1.RouterReturnType
                            ? r.type === 'render' && (await ctx.render(r.path, r.config))
                            : r !== void 0 && (ctx.body = r);
                        next();
                    });
                    return res;
                };
                let { middleWare, router, routerPath } = processControllerMethod();
                runMiddleWare();
                function runMiddleWare() {
                    while (middleWare.length) {
                        let curMiddleWare = middleWare.shift();
                        router = router[curr.toLowerCase()](routerPath, curMiddleWare);
                    }
                    router === null || router === void 0 ? void 0 : router[curr.toLowerCase()](routerPath, fn);
                }
                function processControllerMethod() {
                    var _a, _b;
                    if (!target['router'])
                        target['router'] = new koa_router_1.default();
                    path = path || `/${key}`;
                    if (!constants_1.controllerMethodsMap.get(target))
                        constants_1.controllerMethodsMap.set(target, new Map());
                    if (!((_a = constants_1.controllerMethodsMap.get(target)) === null || _a === void 0 ? void 0 : _a.get(key)))
                        constants_1.controllerMethodsMap.get(target).set(key, {
                            methodDescription: {},
                            params: [],
                            paramsType: {}
                        });
                    let map = (_b = constants_1.controllerMethodsMap.get(target)) === null || _b === void 0 ? void 0 : _b.get(key);
                    let methodDescription = (map === null || map === void 0 ? void 0 : map.methodDescription) || {};
                    let params = map.params.filter((i) => i.decorateType === 'Params');
                    methodDescription.path = path;
                    methodDescription.method = curr;
                    let middleWare = (config === null || config === void 0 ? void 0 : config.middleWare) || [];
                    let router = target['router'];
                    let routerPath = params.reduce((curr, prev) => {
                        return curr + '/:' + prev['name'];
                    }, path);
                    return { middleWare, router, routerPath, path };
                }
            }
        };
        return prev;
    }, {});
    function getFinalParams({ target, key, paramSet, ctx }) {
        return new Array(target[key].OriginLength)
            .fill(1)
            .reduce((prev, curr, index) => {
            var _a;
            const p = paramSet[index];
            const params = ctx.request[(_a = p === null || p === void 0 ? void 0 : p.decorateType) === null || _a === void 0 ? void 0 : _a.toLocaleLowerCase()] || {};
            prev.push((p === null || p === void 0 ? void 0 : p.name) ? (p.decorateValue === constants_1.ALL ? params : params[p.name]) : ctx);
            return prev;
        }, []);
    }
}
_a = initMethod(), exports.Post = _a.Post, exports.Get = _a.Get, exports.Head = _a.Head, exports.Put = _a.Put, exports.Patch = _a.Patch, exports.Option = _a.Option, exports.Delete = _a.Delete;
