import { error } from 'console';
import { Server } from '../lib/server';

/**
 * @description: 通过注入的方式引入表
 * @param {string} modelKey
 * @return {*}
 */
export const InjectDB = (modelKey: string) => {
  return (target: any, key: string) => {
    try {
      //@ts-ignore
      target[key] = Server.prototype['table'][modelKey];
      if (!target[key]) {
        console.error(`please check the table ${key} whether exists`);
        return;
      }
    } catch {
      error('please set initDb to true');
    }
  };
};
