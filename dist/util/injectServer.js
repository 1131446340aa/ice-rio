"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectServer = void 0;
const server_1 = require("../lib/server");
const InjectServer = (serverKey) => {
    return (target, key) => {
        target[key] = server_1.Server.prototype['app'][serverKey];
        if (!target[key]) {
            console.error(`please check the server ${key} whether exists`);
            return;
        }
    };
};
exports.InjectServer = InjectServer;
