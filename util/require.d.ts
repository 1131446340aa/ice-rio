export declare function validated(_: Object, key: string, descriptor: PropertyDescriptor): void;
export declare function requireInt(i: number): "" | "please input Int";
export declare function requireArrayString(i: string, require?: boolean): string;
declare type customRequired = (args: any) => string;
export declare function required<T = unknown>(type?: T extends object ? {
    [key in keyof T]-?: Extract<T[key], undefined> extends never ? T[key] extends string ? 'string' | customRequired : T[key] extends number ? 'number' | customRequired : T[key] extends boolean ? 'boolean' | customRequired : T[key] extends object ? 'object' | customRequired : customRequired : Exclude<T[key], undefined> extends string ? 'string | undefined' | customRequired : Exclude<T[key], undefined> extends number ? 'number | undefined' | customRequired : Exclude<T[key], undefined> extends boolean ? 'boolean | undefined' | customRequired : Exclude<T[key], undefined> extends object ? 'object | undefined' | customRequired : customRequired;
} : 'string' | 'number' | 'boolean' | customRequired): ParameterDecorator;
export {};
