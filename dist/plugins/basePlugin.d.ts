/// <reference types="node" />
import { Server } from 'node:http';
import { IceEnv } from '../util/type';
export declare abstract class IcePlugin {
    env: IceEnv;
    app: any;
    beforeProcessModel?(): Promise<void>;
    traverseModel?(config: {
        fileName: string;
        model: any;
        modelDir: string;
    }): Promise<void>;
    beforeProcessServer?(): Promise<void>;
    traverseServer?(config: {
        fileName: string;
        serverDir: string;
    }): Promise<void>;
    beforeProcessController?(): Promise<void>;
    traverseController?(config: {
        controller: any;
        controllerDir: string;
        fileName: string;
    }): Promise<void>;
    afterProcessController?(): Promise<void>;
    beforeListen?(config: {
        server: Server;
    }): Promise<void>;
}
export declare class BasePlugin {
    set env(v: IceEnv);
    get env(): IceEnv;
    set app(v: any);
    get app(): any;
}
