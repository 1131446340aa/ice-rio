import Koa from 'koa';
export const InjectDB = (modelKey: string) => {
  return (target: any, key: string) => {
    // @ts-ignore
    target[key] = Koa.prototype[modelKey];
  };
};
