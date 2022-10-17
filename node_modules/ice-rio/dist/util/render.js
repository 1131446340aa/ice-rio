"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouterReturnType = exports.render = void 0;
function render(path, config) {
    return new RouterReturnType(path, (config = {}), 'render');
}
exports.render = render;
class RouterReturnType {
    constructor(path, config, type) {
        this.path = path;
        this.config = config;
        this.type = type;
    }
}
exports.RouterReturnType = RouterReturnType;
