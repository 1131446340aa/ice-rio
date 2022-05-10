import { ErrorCode } from './enum';

export class HTTPError extends Error {
  constructor(public message: string, public status: ErrorCode) {
    super();
  }
}

export { All } from './constants';

export { Model, ModelCtor, DataTypes } from './enum';

export { InjectDB } from './injectDb';

export * from './require';
