"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParamNames = void 0;
function getParamNames(func) {
    const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
    const fnStr = func.toString().replace(STRIP_COMMENTS, '');
    let result = fnStr
        .slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'))
        .split(',')
        .map((content) => {
        return content.trim().replace(/\s?=.*$/, '');
    });
    if (result.length === 1 && result[0] === '') {
        result = [];
    }
    return result;
}
exports.getParamNames = getParamNames;
