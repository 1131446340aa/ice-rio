"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateApiDoc = void 0;
const babel_1 = require("./babel");
function generateApiDoc({ method, controller, path, routerName, descpritition, fileName, params, returns }) {
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
exports.generateApiDoc = generateApiDoc;
function generate(params, generateType) {
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
        const type = typeof curr.value || 'unknown';
        return (prev +
            `
   * ${generateType} {${typeMap[type]}} ${generateType === '@apiSuccessExample' ? 'Response-Example' : curr.name} ${type !== 'object'
                ? defaultValue[type]
                : `
        
   * ${generateBody(curr.value)}
    `}`);
    }, '');
    function generateBody(object, indent = 2) {
        const isArray = object instanceof babel_1.CreateArrayType || object.__value__;
        if (isArray) {
            return generateArray(object, indent);
        }
        if (typeof object !== 'object') {
            return defaultValue[typeof object];
        }
        return generateObject(object, indent);
        function generateObject(o, indent) {
            let startStr = `{`;
            let endStr = `
   * ${' '.repeat(indent - 2)}}`;
            let result = Object.keys(o).reduce((prev, curr) => {
                if (typeof o[curr] === 'object') {
                    return (prev +
                        `
   * ${' '.repeat(indent)}"${curr}" : ` +
                        generateBody(o[curr], indent + 2));
                }
                let validType = o[curr]
                    .split('|')
                    .filter((i) => i.trim() !== 'undefined')[0]
                    .trim();
                return (prev +
                    `
   * ${' '.repeat(indent)}"${curr}" : ` +
                    defaultValue[validType] +
                    ',');
            }, '');
            return startStr + result.slice(0, -1) + endStr;
        }
        function generateArray(o, indent) {
            return '[ ' + generateBody(o.__value__, indent + 2) + ' ]';
        }
    }
    return result;
}
