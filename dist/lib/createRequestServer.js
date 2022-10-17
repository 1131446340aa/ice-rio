"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRequestServer = void 0;
const rio_fs_1 = require("../util/rio-fs");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cwd = process.cwd();
class CreateRequestServer {
    constructor(config) {
        this.config = config;
        if (!this.config.timeout)
            this.config.timeout = 5000;
        if (this.config.baseUrl[this.config.baseUrl.length - 1] === '/')
            this.config.baseUrl = this.config.baseUrl.slice(0, -1);
        if (globalThis.window) {
            this.socket = new WebSocket(this.config.baseUrl + '/websockets');
        }
        else {
            const WebSocket = require('websocket').client;
            this.socket = new WebSocket();
            this.socket.connect(this.config.baseUrl.replace(/https?/, 'ws') + '/websockets');
        }
    }
    async connect() {
        let message = '';
        if (globalThis.window) {
            this.socket.onmessage = function (event) {
                message = JSON.parse(event.data);
            };
        }
        else {
            this.socket.on('connect', (ws) => {
                ws.on('message', (v) => {
                    message = JSON.parse(v.utf8Data);
                    ws.close();
                });
            });
        }
        let time = 0;
        while (!message) {
            time += 10;
            if (time > this.config.timeout) {
                throw new Error('连接超时');
            }
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve('');
                }, 10);
            });
        }
        if (globalThis.window) {
            this.socket.close();
        }
        return message;
    }
    async install(generateTS) {
        const baseUrl = this.config.baseUrl;
        let message = await this.connect();
        let server = {};
        const axios = require('axios');
        Object.keys(message).forEach((serverName) => {
            server[serverName] = {};
            Object.keys(message[serverName]).forEach((routerName) => {
                server[serverName][routerName] = async function (config) {
                    return await axios(Object.assign({ method: message[serverName][routerName].method, url: `${baseUrl}${message[serverName][routerName]['path']}${message[serverName][routerName]['routerName'] || '/' + routerName}${config.path ? config.path : ''}` }, config));
                };
            });
        });
        this._server = server;
        this.message = message;
        if (generateTS) {
            await this.generateTS();
        }
        return server;
    }
    async generateTS() {
        if (globalThis.window) {
            throw Error('generateTS 请在 node 环境运行');
        }
        let message = this.message ? this.message : await this.connect();
        let s = '';
        Object.keys(message).forEach((serverName) => {
            let u = '';
            Object.keys(message[serverName]).forEach((routerName) => {
                const v = message[serverName][routerName];
                let flag = false;
                let o = {};
                if (Object.keys(v.headers).length) {
                    o.headers = Object.assign(Object.assign({}, v.headers), { 'req-id': 'string | undefined', stress: 'string | undefined', __optional__: true, __axiosRequestHeaders__: true });
                    flag = true;
                }
                if (Object.keys(v.body).length) {
                    o.data = v.body;
                    flag = true;
                }
                if (Object.keys(v.query).length) {
                    o.params = v.query;
                    flag = true;
                }
                if (Object.keys(v.params).length) {
                    o.path = 'string';
                    flag = true;
                }
                u += `${routerName}:(${flag ? `config:${this.type2Interface(o)}` : ''}) => Promise<AxiosResponse<${v.returnType ? this.type2Interface(v.returnType) : 'void'}>>;
        `;
            });
            s =
                s +
                    `${serverName}: {
          ${u}
      };
      `;
        });
        let r = `
    import { AxiosResponse,AxiosRequestHeaders } from 'axios';
    declare module 'ice-rio' { 
      export interface IRequestServer {
      ${s}
      }
    } `;
        let iceFs = new rio_fs_1.IceFs();
        iceFs.makeDir(path_1.default.join(cwd, '/autoGenerate'));
        iceFs.deleteAllFile(path_1.default.join(cwd, '/autoGenerate'));
        fs_1.default.writeFileSync(path_1.default.join(cwd, '/autoGenerate/type.d.ts'), r);
        return r;
    }
    type2Interface(obj) {
        if (typeof obj !== 'object')
            return obj;
        let u = '';
        Object.keys(obj).forEach((attr) => {
            if (typeof obj[attr] === 'string') {
                const [type, o] = obj[attr].split(' | ');
                u += `'${attr}'${o ? '?' : ''}: ${type};
        `;
            }
            if (typeof obj[attr] === 'object') {
                const optional = obj[attr]['__optional__'];
                const axiosRequestHeaders = obj[attr]['__axiosRequestHeaders__'];
                delete obj[attr]['__optional__'];
                delete obj[attr]['__axiosRequestHeaders__'];
                const isArray = obj[attr]['__value__'];
                u += `'${attr}'${optional ? '?' : ''}: ${this.type2Interface(isArray ? obj[attr]['__value__'] : obj[attr])} ${axiosRequestHeaders ? '& AxiosRequestHeaders' : ''}${isArray ? '[]' : ''};
        `;
            }
        });
        return `{
      ${u}
    }`;
    }
    get server() {
        if (!this._server) {
            throw new Error('请先等待 install 方法执行完成');
        }
        return this._server;
    }
}
exports.CreateRequestServer = CreateRequestServer;
