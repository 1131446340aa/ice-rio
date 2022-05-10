import { ErrorCode } from './enum';
export declare class HTTPError extends Error {
    message: string;
    status: ErrorCode;
    constructor(message: string, status: ErrorCode);
}
export { All } from './constants';
export { Model, ModelCtor, DataTypes } from './enum';
export { InjectDB } from './injectDb';
export * from './require';
