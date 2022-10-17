export declare function render(path: string, config?: Record<string, any>): RouterReturnType;
export declare class RouterReturnType {
    path: string;
    config: Record<string, any>;
    type: string;
    constructor(path: string, config: Record<string, any>, type: string);
}
