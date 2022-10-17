export interface IRequestServer {
    [key: string]: any;
}
export declare class CreateRequestServer {
    config: {
        baseUrl: string;
        timeout?: number;
        ts?: boolean;
    };
    socket: WebSocket;
    private _server;
    message: string;
    constructor(config: {
        baseUrl: string;
        timeout?: number;
        ts?: boolean;
    });
    connect(): Promise<string>;
    install(generateTS?: boolean): Promise<IRequestServer>;
    generateTS(): Promise<string>;
    private type2Interface;
    get server(): IRequestServer;
}
