"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getControllerResult = void 0;
function getControllerResult(controllerMap, _, key, v) {
    let controller = controllerMap.get(_);
    if (!controller) {
        controllerMap.set(_, (controller = new Map()));
    }
    let result = controller === null || controller === void 0 ? void 0 : controller.get(key);
    if (!result) {
        controller.set(key, (result = v));
    }
    return { controller, result };
}
exports.getControllerResult = getControllerResult;
