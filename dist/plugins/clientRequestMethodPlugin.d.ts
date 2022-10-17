/// <reference types="node" />
import { BasePlugin, IcePlugin } from './basePlugin';
import { Server } from 'node:http';
export declare class ClientRequestMethodPlugin extends BasePlugin implements IcePlugin {
    clientRequestMethod: Record<string, any>;
    beforeProcessModel(): Promise<void>;
    traverseController(config: {
        controller: any;
        controllerDir: string;
        fileName: string;
    }): Promise<void>;
    afterProcessController(): Promise<void>;
    beforeListen(config: {
        server: Server;
    }): Promise<void>;
}
