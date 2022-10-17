"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLogId = void 0;
const time_1 = require("./time");
function generateLogId() {
    const date = new Date();
    const timeStr = (0, time_1.timeFormator)(date, 'yyyyMMddHHmmss');
    const msStr = String(date.getTime()).slice(-3);
    const ipStr = getIPAddress()
        .split('.')
        .map((item) => item.padStart(3, '0'))
        .join('');
    const randomStr = Math.round(Math.random() * 0xfff)
        .toString(16)
        .padStart(3, '0')
        .toUpperCase();
    return [timeStr, ipStr, msStr, randomStr].join('');
}
exports.generateLogId = generateLogId;
function getIPAddress() {
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' &&
                alias.address !== '127.0.0.1' &&
                !alias.internal) {
                return alias.address;
            }
        }
    }
}
