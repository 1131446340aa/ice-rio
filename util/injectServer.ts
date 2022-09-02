import { Server } from '../lib/server';
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
