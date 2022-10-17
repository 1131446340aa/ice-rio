import { BasePlugin, IcePlugin } from './basePlugin';
export declare class GenerateTypePlugin extends BasePlugin implements IcePlugin {
    result: string;
    tableAttr: string;
    serverAttr: string;
    DBStr: string;
    ServerStr: string;
    beforeProcessModel(): Promise<void>;
    traverseModel(config: {
        fileName: string;
        model: any;
        modelDir: string;
    }): Promise<void>;
    beforeProcessServer(): Promise<void>;
    traverseServer(config: {
        fileName: string;
        serverDir: string;
    }): Promise<void>;
    beforeProcessController(): Promise<void>;
    afterProcessController(): Promise<void>;
}
