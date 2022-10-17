import { BasePlugin, IcePlugin } from './basePlugin';
export declare class parsePlugin extends BasePlugin implements IcePlugin {
    result: string;
    beforeProcessModel(): Promise<void>;
    traverseController(config: {
        controller: any;
        controllerDir: string;
        fileName: string;
    }): Promise<void>;
    afterProcessController(): Promise<void>;
}
