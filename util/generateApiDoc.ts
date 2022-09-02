import {  IGenerateApiDoc } from './constants';
import { CreateArrayType } from './babel';
export function generateApiDoc({
  method,
  controller,
  path,
  routerName,
  description,
  fileName,
  params,
  returns
}: IGenerateApiDoc) {
  
  let apiParam = params.filter(i=>i.type === 'Params')
  let apiBody = params.filter(i=>i.type === 'Body')
  let apiQuery = params.filter(i=>i.type === 'Query')
  return `/**
   * @api {${method.toUpperCase()}} ${controller}${path}${apiParam.reduce((prev,curr)=>{return prev + '/:' + curr.name},'')} ${String(
    routerName || path.slice(1)
  )}
   * @apiDescription ${description}
   * @apiGroup ${fileName}
   *
   * ${apiParam.length ? generate(apiParam, '@apiParam') : ''}
   * ${apiBody.length ? generate(apiBody, '@apiParam') : ''}
   * ${apiQuery.length ? generate(apiQuery, '@apiParam') : ''}
   * ${generate([returns], '@apiSuccessExample')}
   * */
  
  
  `;
}

function generate(
  params: { name: string; value: any }[],
  generateType: '@apiParam' | '@apiSuccessExample' | '@apiBody' | '@apiQuery'
) {
  const typeMap = {
    string: 'String',
    number: 'Number',
    boolean: 'Boolean',
    object: 'JSON',
    unknown: 'Unknown'
  };
  const defaultValue = {
    string: `"String"`,
    number: 0,
    boolean: true,
    unknown: 0
  };
  let result = params.reduce((prev, curr) => {
    const type =  (typeof curr.value === 'object' ? 'object' : curr.value) || 'unknown';
    return (
      prev +
      `
   * ${generateType} {${typeMap[type as keyof typeof typeMap]}} ${
        generateType === '@apiSuccessExample' ? 'Response-Example' : curr.name
      } ${
        type !== 'object'
          ? defaultValue[type as keyof typeof defaultValue]
          : `
        
   * ${generateBody(curr.value)}
    `
      }`
    );
  }, '');

  function generateBody(object: any, indent = 2) {
    const isArray = object instanceof CreateArrayType || object.__value__;
    if (isArray) {
      return generateArray(object, indent);
    }
    if (typeof object !== 'object') {
      //@ts-ignore
      return defaultValue[typeof object];
    }
    return generateObject(object, indent);
    function generateObject(o: Record<string, any>, indent: number) {
      delete o['__optional__']
      let startStr = `{`;
      let endStr = `
   * ${' '.repeat(indent - 2)}}`;
      let l = Object.keys(o);
      let result: string = l.reduce((prev, curr, index) => {
        if (typeof o[curr] === 'object') {
          return (
            prev +
            `
   * ${' '.repeat(indent)}"${curr}" : ` +
            generateBody(o[curr], indent + 2)
          );
        }
        //@ts-ignore
        let validType = o[curr]
          .split('|')
          .filter((i: string) => i.trim() !== 'undefined')[0]
          .trim();
        return (
          prev +
          `
   * ${' '.repeat(indent)}"${curr}" : ` +
          defaultValue[validType as keyof typeof defaultValue] +
          `${index === l.length - 1 ? '' : ','}`
        );
      }, '');
      return startStr + result + endStr;
    }
    function generateArray(o: CreateArrayType, indent: number): string {
      return '[ ' + generateBody(o.__value__, indent + 2) + ' ]';
    }
  }
  return result;
}
