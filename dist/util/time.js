"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = exports.timeFormator = void 0;
function timeFormator(date = new Date(), format = 'yyyy-MM-dd HH:mm:ss') {
    return format
        .replace('yyyy', date.getFullYear().toString())
        .replace('MM', (date.getMonth() + 1).toString().padStart(2, '0'))
        .replace('dd', date.getDate().toString().padStart(2, '0'))
        .replace('HH', date.getHours().toString().padStart(2, '0'))
        .replace('mm', date.getMinutes().toString().padStart(2, '0'))
        .replace('ss', date.getSeconds().toString().padStart(2, '0'));
}
exports.timeFormator = timeFormator;
function delay(ms = 100) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}
exports.delay = delay;
