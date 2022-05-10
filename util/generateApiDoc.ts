import { IGenerateApiDoc } from './constants';
import { CreateArrayType } from './babel';
export function generateApiDoc({
  method,
  controller,
  path,
  routerName,
  descpritition,
  fileName,
  params,
  returns
}: IGenerateApiDoc) {
  return `/**
   * @api {${method.toUpperCase()}} ${controller}${path} ${routerName}
   * @apiDescription ${descpritition}
   * @apiGroup ${fileName}
   *
   * ${generate(params, '@apiParam')}
   * ${generate([returns], '@apiSuccessExample')}
   * */
  
  
  `;
}

function generate(
  params: { name: string; value: any }[],
  generateType: '@apiParam' | '@apiSuccessExample'
) {
  const typeMap = {
    string: 'String',
    number: 'Number',
    boolean: 'Boolean',
    object: 'JSON',
    unknown: 'Unknown'
  };
  const defaultValue = {
    string: `"defaultString"`,
    number: 0,
    boolean: true,
    unknown: 0
  };
  let result = params.reduce((prev, curr) => {
    const type = typeof curr.value || 'unknown';
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

  function generateBody(object: any) {
    const isArray = object instanceof CreateArrayType || object.__value__;
    if (isArray) {
      return generateArray(object);
    }
    if (typeof object !== 'object') {
      //@ts-ignore
      return defaultValue[typeof object];
    }
    return generateObject(object);
    function generateObject(o: Record<string, any>) {
      let startStr = `{`;
      let endStr = `
   * }`;
      let result: string = Object.keys(o).reduce((prev, curr) => {
        if (typeof o[curr] === 'object') {
          return (
            prev +
            `
   *   "${curr}" : ` +
            generateBody(o[curr])
          );
        }
        let validType = o[curr]
          .split('|')
          .filter((i: string) => i.trim() !== 'undefined')[0]
          .trim();
        return (
          prev +
          `
   *    "${curr}" : ` +
          defaultValue[validType as keyof typeof defaultValue]
        );
      }, '');
      return startStr + result + endStr;
    }
    function generateArray(o: CreateArrayType): string {
      return '[' + generateBody(o.__value__) + ']';
    }
  }

  return result;
}
