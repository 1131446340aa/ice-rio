"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePlugin = exports.IcePlugin = void 0;
class IcePlugin {
    async beforeProcessModel() { }
    async traverseModel(config) { }
    async beforeProcessServer() { }
    async traverseServer(config) { }
    async beforeProcessController() { }
    async traverseController(config) { }
    async afterProcessController() { }
    async beforeListen(config) { }
}
exports.IcePlugin = IcePlugin;
class BasePlugin {
    set env(v) {
        this.__env__ = v;
    }
    get env() {
        return this.__env__;
    }
    set app(v) {
        this.__app__ = v;
    }
    get app() {
        return this.__app__;
    }
}
exports.BasePlugin = BasePlugin;
