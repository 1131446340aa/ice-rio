import { ErrorCode } from './type';
export declare class HTTPError extends Error {
    message: string;
    status: ErrorCode;
    constructor(message: string, status: ErrorCode);
}
export declare function underline(str: string): string;
export { ALL } from './constants';
export { InjectDB } from './injectDb';
export * from './render';
export * from './require';
export * from './logId';
export * from './time';
export { InjectServer } from './injectServer';
export * from 'sequelize';
