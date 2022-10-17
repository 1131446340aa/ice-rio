"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.controller = exports.CONTROLLER_KEY = void 0;
require("reflect-metadata");
exports.CONTROLLER_KEY = Symbol('ioc:controller_key');
function controller(path, ...args) {
    return function (target) {
        Reflect.defineMetadata(exports.CONTROLLER_KEY, {
            path,
            args: args || []
        }, target);
    };
}
exports.controller = controller;
