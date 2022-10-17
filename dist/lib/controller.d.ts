import 'reflect-metadata';
export declare const CONTROLLER_KEY: unique symbol;
export declare function controller(path: string, ...args: any[]): (target: any) => void;
