import { BasePlugin, IcePlugin } from './basePlugin';
export declare class ApiDocPlugin extends BasePlugin implements IcePlugin {
    dir: string;
    constructor(dir: string);
    beforeProcessModel(): Promise<void>;
    traverseController(config: {
        controller: any;
        controllerDir: string;
        fileName: string;
    }): Promise<void>;
}
