import { Server } from '../lib/server';
/**
 * @description: 通过注入的方式引入 服务
 * @param {string} serverKey
 * @return {*}
 */
export const InjectServer = (serverKey: string) => {
  return (target: any, key: string) => {
    // @ts-ignore
    target[key] = Server.prototype['app'][serverKey];
    if (!target[key]) {
      console.error(`please check the server ${key} whether exists`);
      return;
    }
  };
};
