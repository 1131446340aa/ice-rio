import { BasePlugin, IcePlugin } from './basePlugin';
export declare class ParseInterfacePlugin extends BasePlugin implements IcePlugin {
    interfaceFileName: string;
    constructor(interfaceFileName: string);
    beforeProcessModel(): Promise<void>;
}
