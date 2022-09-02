export interface IRequestServer {
  [key: string]: any;
}
import { IceFs } from '../util/rio-fs';
import path from 'path';
import fs from 'fs';
const cwd = process.cwd();
export class CreateRequestServer {
  socket: WebSocket;
  private _server: IRequestServer;
  message: string;
  constructor(
    public config: { baseUrl: string; timeout?: number; ts?: boolean }
  ) {
    if (!this.config.timeout) this.config.timeout = 5000;

    if (this.config.baseUrl[this.config.baseUrl.length - 1] === '/')
      this.config.baseUrl = this.config.baseUrl.slice(0, -1);
    if (globalThis.window) {
      this.socket = new WebSocket(this.config.baseUrl + '/websockets');
    } else {
      const WebSocket = require('websocket').client;
      this.socket = new WebSocket();
      //@ts-ignore
      this.socket.connect(
        this.config.baseUrl.replace(/https?/, 'ws') + '/websockets'
      );
    }
  }
  /**
   * @description: 通过 websocket 连接服务器
   * @return {*}
   */
  async connect() {
    let message = '';
    if (globalThis.window) {
      this.socket.onmessage = function (event) {
        message = JSON.parse(event.data);
      };
    } else {
      //@ts-ignore
      this.socket.on('connect', (ws) => {
        //@ts-ignore
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

  /**
   * @description: 生成客户端调用服务端的方法
   * @param {boolean} generateTS
   * @return {*}
   */
  async install(generateTS?: boolean): Promise<IRequestServer> {
    const baseUrl = this.config.baseUrl;
    let message = await this.connect();
    let server: Record<string, Record<string, any>> = {};
    const axios = require('axios');
    Object.keys(message).forEach((serverName) => {
      server[serverName] = {};
      //@ts-ignore
      Object.keys(message[serverName]).forEach((routerName) => {
        server[serverName][routerName] = async function (config: any) {
          return await axios({
            //@ts-ignore
            method: message[serverName][routerName].method,
            url: `${baseUrl}${
              //@ts-ignore
              message[serverName][routerName]['path']
            }${
              //@ts-ignore 方法（get、post....） 等入参的情况
              message[serverName][routerName]['routerName'] || '/' + routerName
            }${config.path ? config.path : ''}`,
            ...config
          });
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

  /**
   * @description: 本地生成客户端需要的 ts 类型
   * @return {*}
   */
  async generateTS() {
    if (globalThis.window) {
      throw Error('generateTS 请在 node 环境运行');
    }
    let message = this.message ? this.message : await this.connect();
    let s = '';
    Object.keys(message).forEach((serverName) => {
      let u = '';
      //@ts-ignore
      Object.keys(message[serverName]).forEach((routerName) => {
        //@ts-ignore
        const v = message[serverName][routerName];
        let flag = false;
        let o: Record<string, any> = {};
        if (Object.keys(v.headers).length) {
          o.headers = {
            ...v.headers,
            'req-id': 'string | undefined',
            stress: 'string | undefined',
            __optional__: true,
            __axiosRequestHeaders__: true
          };
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

        u += `${routerName}:(${
          flag ? `config:${this.type2Interface(o)}` : ''
        }) => Promise<AxiosResponse<${
          v.returnType ? this.type2Interface(v.returnType) : 'void'
        }>>;
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
    let iceFs = new IceFs();
    iceFs.makeDir(path.join(cwd, '/autoGenerate'));
    iceFs.deleteAllFile(path.join(cwd, '/autoGenerate'));
    fs.writeFileSync(path.join(cwd, '/autoGenerate/type.d.ts'), r);
    return r;
  }

  /**
   * @description: 将函数的类型的 JSON 描述转化为 interface
   * @param {any} obj
   * @return {*}
   */
  private type2Interface(obj: any) {
    if (typeof obj !== 'object') return obj;
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
        u += `'${attr}'${optional ? '?' : ''}: ${this.type2Interface(
          isArray ? obj[attr]['__value__'] : obj[attr]
        )} ${axiosRequestHeaders ? '& AxiosRequestHeaders' : ''}${
          isArray ? '[]' : ''
        };
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
