import { HTTPError } from '../util';
import { ErrorCode } from './type';
import { controllerMethodsMap } from './constants';
import { CreateArrayType } from '../lib/babel';
type Validator = (
  x: any,
  paramName: string,
  defaultType?: any
) => Promise<string>;

const validateMap: Record<string, Validator[]> = {};

function typedDecoratorFactory(validator: Validator): ParameterDecorator {
  return (_, key, index) => {
    const target = validateMap[key as string] ?? [];
    target[index] = validator;
    validateMap[key as string] = target;
  };
}
/**
 * @description: 和 required 函数搭配，用于校验请求的参数类型。代码写的很烂,不想改了,摆烂。累了,毁灭去吧 …………
 */
export function validated(
  _: Object,
  key: string,
  descriptor: PropertyDescriptor
) {
  const originalFn = descriptor.value;
  //@ts-ignore
  const length = _[key].length;
  descriptor.value = async function (...args: any[]) {
    const validatorList = validateMap[key];
    if (validatorList) {
      for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        const validator = validatorList[index];
        if (!validator) continue;
        //@ts-ignore
        const { __env__, __dir__ } = _;
        let validatorParams = {};
        validatorParams =
          __env__ === 'prod'
            ? (await import(__dir__)).default.get(_)?.get(key)?.paramsType || {}
            : controllerMethodsMap.get(_)?.get(key)?.paramsType || {};
        const params = controllerMethodsMap.get(_)?.get(key)?.params || [];
        
        const result = await validator(
          arg,
          params[index].name,
          //@ts-ignore
          validatorParams[params[index].name]
        );
        if (result) {
          // 考虑到目前只会检验请求体，所以参数是对象不上报是函数的第几个参数
          throw new HTTPError(
            typeof arg === 'object'
              ? `Failed for parameter: ${result}`
              : `Failed for parameter: ${result}`,
            ErrorCode.ParameterError
          );
        }
      }
    }
    return await originalFn.call(this, ...args);
  };
  descriptor.value.OriginLength = length;
}
/**
 * @description: 校验是否是整性
 * @param {number} i
 * @return {*}
 */
export function requireInt(i: number) {
  if (!Number.isInteger(i)) {
    return 'please input Int';
  }
  return '';
}

/**
 * @description: 校验是否是数组字符串
 * @param {string} i
 * @param {*} require
 * @return {*}
 */
export function requireArrayString(i: string, require = false) {
  if (!i && !require) return '';
  try {
    let arr = JSON.parse(i);
    if (Array.isArray(arr)) return '';
    return 'Please enter an array string';
  } catch (error) {
    return (error as Error).message;
  }
}

type customRequired = (args: any) => string;

// 不入参会自动编译 ts interface，将 interface 入参
export function required<T = unknown>(
  //如果函数调用时没有加上泛型,只能输入 string、number、boolean、customRequired 类型的参数,所以如果是校验对象,一定需要加上泛型调用
  //入参是对象时,一定要加上泛型
  // 如果泛型的值是可选属性,参数也需要必填，只是值为 xx | undefined， 代表不传不会校验，传了就必须符合 xx 类型 (如 xx 为 string)
  // 如果泛型的值类型是 string,那么函数的参数对应的值只能填 'string' 或者 customRequired,填写其他的直接在 ts 阶段出错
  // 如果看不明白,搜索 required 函数使用的地方改一下入参就能明白
  // 泛型是否是对象
  type?: T extends object
    ? {
        // 先将可选属性变为必填
        [key in keyof T]-?: Extract<T[key], undefined> extends never // 是否是可选字段,类型中选不出 undefined 类型就是必选字段
          ? // 不是可选字段,将类型转化为字符串
            T[key] extends string
            ? 'string' | customRequired
            : T[key] extends number
            ? 'number' | customRequired
            : T[key] extends boolean
            ? 'boolean' | customRequired
            : T[key] extends object
            ? 'object' | customRequired
            : customRequired
          : // 是可选字段,先将可选字段的 undefined 属性删除使其成为必选字段然后再使用类型约束
          Exclude<T[key], undefined> extends string
          ? 'string | undefined' | customRequired
          : Exclude<T[key], undefined> extends number
          ? 'number | undefined' | customRequired
          : Exclude<T[key], undefined> extends boolean
          ? 'boolean | undefined' | customRequired
          : Exclude<T[key], undefined> extends object
          ? 'object | undefined' | customRequired
          : customRequired;
      }
    : // 不是对象就只能是普通类型或者自定义校验
      'string' | 'number' | 'boolean' | customRequired
) {
  return typedDecoratorFactory(async (query, paramsName, defaultType) => {
    /**
     * @description: 检验参数是否合法
     * @param {any} type
     * @param {any} query
     * @param {*} key
     * @return {*}
     */
    function check(type: any, query: any, key = ''): string {
      /**
       * @description: 检验对象类型
       * @return {*}
       */
      function checkObject(
        type: Record<string, string>,
        query: Record<string, string>,
        key: string
      ) {
        if (type.__optional__) {
          if (query === undefined) return '';
        }
        if (typeof query !== 'object') {
          return `The type of verification parameter ${key} is an object,but the type of input is ${typeof query}, please check`;
        }
        for (let item of Object.keys(type)) {
          //@ts-ignore
          let ret = check(
            type[item],
            query[item],
            key ? key + '.' + item : item
          );
          // @ts-ignore
          if (ret) return ret;
        }
        return '';
      }
      /**
       * @description: 检验普通类型
       * @param {string} type
       * @param {any} query
       * @param {string} key
       * @return {*}
       */
      function checkOrdinaryType(type: string, query: any, key: string) {
        const index = type.indexOf('|');
        if (query === undefined) {
          if (index === -1)
            return `the Parameter ${key} is required,please verify the parameters`;
          return '';
        }
        let validType = type
          .split('|')
          .filter((i: string) => i.trim() !== 'undefined')[0]
          .trim();
        if (typeof query !== validType) {
          return `the type of Parameter ${key} is ${validType},but the type of input is ${typeof query}, please verify the parameters`;
        }
        return '';
      }
      /**
       * @description: 自定义校验
       * @param {Function} type
       * @param {any} query
       * @param {string} key
       * @return {*}
       */
      function checkFunction(type: Function, query: any, key: string) {
        let ret = type(query);
        if (ret)
          return `The parameter ${key} is a custom check,the error message is as follows:${ret},please verify the parameters`;
        return '';
      }
      /**
       * @description: 检验数组类型
       * @param {any} type
       * @param {any} query
       * @param {*} key
       * @return {*}
       */
      function checkArrayType(type: any, query: any[], key = '') {
        if (!Array.isArray(query)) {
          return `The parameter ${key} is array,but the type of input is ${typeof query},please verify the parameters`;
        }
        if (type.__optional__) {
          if (query === undefined) return '';
        }
        return check(type.__value__, query[0], key + `[0]`);
      }
      if (type instanceof CreateArrayType || type.__value__) {
        return checkArrayType(type, query, key);
      }
      if (typeof type === 'object') {
        return checkObject(type, query, key);
      }
      if (typeof type === 'function') {
        return checkFunction(type, query, key);
      }
      return checkOrdinaryType(type, query, key);
    }

    return check(type || defaultType, query, paramsName);
  });
}
