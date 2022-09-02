// @ts-ignore
// eslint-disable-next-line @typescript-eslint/ban-types
/**
 * @description: 获取函数参数值的名字
 * @param {Function} func
 * @return {*}
 */
export function getParamNames(func: Function) {
  const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
  const fnStr = func.toString().replace(STRIP_COMMENTS, '');
  let result = fnStr
    .slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'))
    .split(',')
    .map((content) => {
      return content.trim().replace(/\s?=.*$/, '');
    });
  if (result.length === 1 && result[0] === '') {
    result = [];
  }
  return result;
}
