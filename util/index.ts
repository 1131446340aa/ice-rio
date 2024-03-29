import { ErrorCode } from './type';

export class HTTPError extends Error {
  constructor(public message: string, public status: ErrorCode) {
    super();
  }
}

export function underline(str: string) {
  return str.replace(/\B([A-Z])/g, '_$1').toLowerCase();
}

export { ALL } from './constants';


export { InjectDB } from './injectDb';

export * from './render';

export * from './require';

export * from './logId';

export * from './time';

export { InjectServer } from './injectServer';

export * from 'sequelize';
