"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectDB = void 0;
const console_1 = require("console");
const server_1 = require("../lib/server");
const InjectDB = (modelKey) => {
    return (target, key) => {
        try {
            target[key] = server_1.Server.prototype['table'][modelKey];
            if (!target[key]) {
                console.error(`please check the table ${key} whether exists`);
                return;
            }
        }
        catch (_a) {
            (0, console_1.error)('please set initDb to true');
        }
    };
};
exports.InjectDB = InjectDB;
