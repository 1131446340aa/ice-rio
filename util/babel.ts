import fs from 'fs';
import traverse from 'babel-traverse';
import path from 'path';
import { controllerMethodsMap } from './constants';

const genericityTypeParamsMap: Record<string, any> = {};
export let validatedTypeMap: Record<string, any> = {};

export function parse(fileName: string) {
  const parser = require('@babel/parser');
  const ast = parser.parse(getSourceFile(fileName), {
    plugins: [
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-proposal-class-properties', { loose: true }],
      'typescript',
      'classProperties',
      'decorators-legacy'
    ],
    sourceType: 'module'
  });
  return ast;
}

export function generateFinalParams(
  ast: any,
  controller: Object,
  enableApiDoc = false
) {
  const methods = controllerMethodsMap.get(controller) || new Map();
  let className = '';
  traverse(ast, {
    ClassMethod(n: any) {
      let methodNode = n.node;
      const leadingComments = methodNode.leadingComments;
      let methodName = methodNode.key.name;
      let returnNodes = methodNode.returnType;

      function generateReturnType(node: any, result = {}) {
        if (node.typeName.name === 'Promise') {
          const PromiseNode = node.typeParameters.params[0];
          generateParam({
            node: PromiseNode,
            parent: result,
            key: 'value',
            nodeType: PromiseNode.type
          });
        } else {
          throw new Error(
            `${className}.${methodName} 的返回值类型必须是 Promise `
          );
        }
        //@ts-ignore
        return result.value;
      }
      function generateDescription(leadingComments: any, u: any) {
        leadingComments?.forEach((i: any) => {
          if (i.type === 'CommentLine') {
            u.methodDescription.description = i.value.trim();
          }
          if (i.type === 'CommentBlock') {
            if (i.value.includes('@description:')) {
              //@ts-ignore
              u.methodDescription.description = i.value
                .split('@description:')[1]
                .split(`\n`)[0]
                .trim();
            }
          }
        });
      }
      let u = methods.get(methodName);
      let params = u?.params || [];
      // 如果函数没有参数,则不需要参数校验和生成 api doc,因此可以直接返回
      if (!params.length) return;
      // 只有开启了接口文档才需要解析返回值
      enableApiDoc &&
        (!returnNodes?.typeAnnotation
          ? console.warn(`${className}.${methodName} : need add return Type`)
          : (u.returnType = generateReturnType(
              returnNodes.typeAnnotation,
              {}
            )));

      let finalParams = {};
      generateParam({
        node: methodNode,
        parent: finalParams,
        key: 'value',
        nodeType: 'TsMethodParamVale',
        optional: false,
        paramsDecorate: params.map((i: any) => i.decorateType)
      });

      //@ts-ignore
      u.paramsType = finalParams.value;
      generateDescription(leadingComments, u);
    },
    Class(n) {
      className = n.node.id.name;
    }
  });
}

export class CreateArrayType {
  __optional__: boolean;
  constructor(public __value__: any, __optional__?: boolean) {
    if (__optional__) {
      this.__optional__ = __optional__;
    }
  }
}

function getSourceFile(fileName: string) {
  let source = '';
  for (let i of ['', '.ts', '.d.ts']) {
    try {
      source = fs.readFileSync(fileName + i, 'utf8');
      break;
    } catch {}
  }
  return source;
}

function generateParam({
  node,
  parent,
  key,
  nodeType,
  optional,
  paramsDecorate,
  parentName,
  typeParams
}: {
  node: any;
  parent: Record<string, any>;
  key: string;
  nodeType: string;
  optional?: boolean;
  paramsDecorate?: string[];
  parentName?: string;
  typeParams?: any[];
}) {
  const TsTypeAnnotationTypeMap = {
    // 只考虑 string、bool、number、object、和外部引用的情况
    // 对象类型,递归即可
    TSTypeLiteral: generateParam,

    TSArrayType: generateParam,
    // TSLiteralType:generateParam,
    // 引用文件
    TSTypeReference: processTSTypeReference,
    TsMethodParamVale: generateParam,
    TSInterfaceBody: generateParam,
    TSBooleanKeyword: 'boolean',
    TSStringKeyword: 'string',
    TSNumberKeyword: 'number',
    TSLiteralType: 'literal',
    TSUnionType: 'TSUnionType',
    TSIntersectionType: () => {
      node.types.forEach((node: any) => {
        generateParam({
          node,
          parent,
          key,
          nodeType: node.type,
          optional,
          paramsDecorate
        });
      });
    }
  };

  // any 和 void 直接跳过
  if (['TSAnyKeyword', 'TSVoidKeyword'].includes(nodeType)) return;
  //@ts-ignore
  const tsType = TsTypeAnnotationTypeMap[nodeType];
  if (!tsType) {
    throw new Error(`在路由的返回或者参数中,不支持使用 ${nodeType} `);
  }
  if (nodeType === 'TSUnionType') {
    processTSUnionType(node, nodeType, parent, key, optional, paramsDecorate);
    return;
  }
  if (nodeType === 'TSLiteralType') {
    // 字面量类型
    processTSLiteralType(node, parent, key, optional);
    return;
  }
  if (typeof tsType === 'string') {
    // string | bool | number
    parent[key] = `${tsType}${optional ? ' | undefined' : ''}`;
  }
  if (typeof tsType === 'function') {
    if (nodeType === 'TSIntersectionType') {
      // '&' 关键字
      tsType();
      return;
    }

    if (node.type === 'TSArrayType') {
      // 处理数组
      parent = parent[key] = new CreateArrayType('', optional);
      tsType({
        node: node.elementType,
        parent,
        key: '__value__',
        nodeType: node.elementType.type
      });
      return;
    }
    if (nodeType === 'TSTypeReference') {
      processTSTypeReference({
        node,
        parent,
        parentName,
        typeParams,
        key,
        nodeType
      });
      return;
    }
    processObject({
      node,
      nodeType,
      parent,
      key,
      optional,
      paramsDecorate,
      parentName,
      typeParams
    });
  }
}

function processObject({
  node,
  nodeType,
  parent,
  key,
  optional,
  paramsDecorate,

  parentName,
  typeParams
}: {
  node: any;
  nodeType: string;
  parent: Record<string, any>;
  key: string;
  optional: boolean;
  paramsDecorate: string[];

  parentName: string;
  typeParams: any[];
}) {
  const nodeParamsKeyMap = {
    TsMethodParamVale: 'params',
    TSTypeLiteral: 'members',
    TSInterfaceBody: 'body'
  };
  //@ts-ignore
  const nodeParams = node[nodeParamsKeyMap[nodeType]];
  parent = parent[key] = parent[key] || {};
  if (optional) {
    parent['__optional__'] = true;
  }
  for (let i = 0; i < nodeParams.length; i++) {
    // 没有装饰的参数不需要处理
    if (paramsDecorate && !paramsDecorate[i]) continue;
    let nodeParam = nodeParams[i];

    node = nodeParam?.typeAnnotation?.typeAnnotation;
    optional = nodeParam.optional;
    key =
      nodeParam.type === 'TSPropertySignature'
        ? nodeParam.key.name
        : nodeParam.name;
    nodeType = node.type;
    generateParam({
      node,
      nodeType,
      key,
      parent,
      optional,
      parentName,
      typeParams
    });
  }
  return { node, nodeType, parent, key, optional };
}

function processTSLiteralType(
  node: any,
  parent: Record<string, any>,
  key: string,
  optional: boolean
) {
  let type = typeof node.literal.value;
  parent[key] = `${type}${optional ? ' | undefined' : ''}`;
}

function processTSUnionType(
  node: any,
  nodeType: string,
  parent: Record<string, any>,
  key: string,
  optional: boolean,
  paramsDecorate: string[]
) {
  node = node.types[0];
  nodeType = node.type;
  generateParam({
    node,
    parent,
    key,
    nodeType: node.type,
    optional,
    paramsDecorate
  });
  return { node, nodeType };
}

export function getValidatedTypeMap() {
  let validatedTypeAst;
  try {
    validatedTypeAst = parse(
      path.join(process.cwd(), '/interface/validated.ts')
    );
  } catch {}
  validatedTypeAst &&
    traverse(validatedTypeAst, {
      enter(path: any) {
        const nodeMap = {
          TSInterfaceDeclaration: 'body',
          TSTypeAliasDeclaration: 'typeAnnotation'
        };
        processValidatedNode();

        function processExtend(extend: any, key: any) {
          for (let node of extend) {
            if (!validatedTypeMap[node.expression.name]) {
              throw new Error(`类型 ${node.expression.name} 在声明前被使用`);
            }
            validatedTypeMap[key] = {
              ...validatedTypeMap[key],
              ...validatedTypeMap[node.expression.name]
            };
          }
        }

        function processGenericityParams(typeParameters: any, node: any) {
          typeParameters.params?.forEach((i: any, index: number) => {
            let r = {};
            //@ts-ignore
            if (!genericityTypeParamsMap[node.id.name])
              genericityTypeParamsMap[node.id.name] = {};
            i.default &&
              generateParam({
                node: i.default,
                nodeType: i.default.type,
                key: 'value',
                parent: r
              });
            genericityTypeParamsMap[node.id.name][i.name] = {
              index,
              //@ts-ignore
              value: r.value
            };
          });
        }
        function processValidatedNode() {
          if (
            [
              'TSEnumDeclaration',
              'TSTypeAliasDeclaration',
              'TSInterfaceDeclaration'
            ].includes(path.node.type)
          ) {
            let node = path.node;
            let type = node.type;
            const key = node.id.name;
            if (type === 'TSEnumDeclaration') {
              validatedTypeMap[node.id.name] = typeof (
                node?.[0]?.initializer?.value || 0
              );
              return;
            }
            const { typeParameters, extends: extend } = node;

            typeParameters && processGenericityParams(typeParameters, node);

            //@ts-ignore
            node = node[nodeMap[type]];
            type = node.type;
            typeParameters
              ? (validatedTypeMap[key] = (typeParams: any[]) =>
                  getParams({
                    node,
                    parentName: typeParameters ? key : undefined,
                    typeParams
                  }))
              : generateParam({
                  node,
                  parent: validatedTypeMap,
                  key,
                  nodeType: type,
                  parentName: typeParameters ? key : undefined
                });
            extend && processExtend(extend, key);
          }
        }
      }
    });
}

function processTSTypeReference({
  node,
  parentName,
  typeParams,
  key,
  parent,
  nodeType
}: {
  node: any;
  parentName?: string;
  typeParams?: any[];
  key: string;
  parent: Record<string, any>;
  nodeType: string;
}) {
  const { typeParameters } = node;
  const typeParametersParams = typeParameters?.params;
  const moduleName = node.typeName.name;

  if (['Pick', 'Omit', 'Partial', 'Required', 'RioType'].includes(moduleName)) {
    processGlobalReference();
    return;
  }

  parentName ? initGenericityTypeValue() : writeGenericityTypeValue();

  function writeGenericityTypeValue() {
    const isReference = genericityTypeParamsMap?.[moduleName];

    isReference
      ? processReference()
      : (() => {
          if (!validatedTypeMap[moduleName]) {
            throw new Error(`类型 ${moduleName} 在声明前被使用`);
          }
          parent[key] = validatedTypeMap[moduleName];
        })();

    function processReference() {
      const typeParams = typeParametersParams?.map((node: any) => {
        let name = node?.typeName?.name;
        if (!name) return getParams({ node });
        if (typeof validatedTypeMap[name] === 'function')
          return getParams({ node });
        let parent = new createParent();
        processTSTypeReference({
          node,
          nodeType,
          parent,
          key: '__value__'
        });
        return parent['__value__'];
      });
      if (!validatedTypeMap[moduleName]) {
        throw new Error(`类型 ${moduleName} 在声明前被使用`);
      }
      parent[key] = validatedTypeMap[moduleName](typeParams);
    }
  }

  function initGenericityTypeValue() {
    let module = genericityTypeParamsMap?.[parentName]?.[moduleName];
    !typeParams?.length
      ? module?.value && (parent[key] = module['value'])
      : module &&
        (parent[key] = typeParams[module['index']] || module['value']);
  }

  function processNode() {
    let attrNode = node.typeParameters.params[1];
    let attrKey: string[] = [];
    if (attrNode) {
      if (attrNode.type === 'TSUnionType') {
        attrKey = node.typeParameters.params[1].types.map(
          (i: any) => i.literal.value
        );
      } else {
        moduleName !== 'RioType' && (attrKey = [attrNode.literal.value]);
      }
    }
    return { attrNode, attrKey };
  }

  function processGlobalReference() {
    let { attrNode, attrKey }: { attrNode: any; attrKey: string[] } =
      processNode();
    if (moduleName === 'RioType') {
      if (!attrNode) {
        return;
      }
      generateParam({
        node: attrNode,
        nodeType: attrNode.type,
        parent,
        key
      });
      return;
    }
    node = node.typeParameters.params[0];
    nodeType = node.type;
    let r = new createParent();
    generateParam({
      node,
      nodeType,
      parent: r,
      key: '__value__'
    });
    parent[key] = JSON.parse(JSON.stringify(r.__value__));
    Object.keys(parent[key]).forEach((i) => {
      if (moduleName === 'Required') {
        processRequired(i);
        return;
      }
      if (moduleName === 'Partial') {
        processPartial(i);
        return;
      }
      if (!attrKey.includes(i)) {
        moduleName === 'Pick' && delete parent[key][i];
      } else {
        moduleName === 'Omit' && delete parent[key][i];
      }
    });
    function processPartial(i: string) {
      if (
        typeof r['__value__'][i] === 'string' &&
        !parent[key][i].includes('|')
      ) {
        parent[key][i] = parent[key][i] + ' | undefined';
      }

      if (typeof parent[key][i] === 'object') {
        parent[key][i]['__optional__'] = true;
      }
    }

    function processRequired(i: string) {
      if (typeof parent[key][i] === 'string') {
        parent[key][i] = parent[key][i].split(' | ')[0];
      }
      if (typeof parent[key][i] === 'object') {
        delete parent[key][i]['__optional__'];
      }
    }
  }
}

class createParent {
  constructor(public __value__?: any) {}
}

function getParams({
  node,
  parentName,
  typeParams
}: {
  node: any;
  parentName?: string;
  typeParams?: any[];
}) {
  let parent = new createParent();
  generateParam({
    node,
    nodeType: node.type,
    parent,
    key: '__value__',
    parentName,
    typeParams
  });
  return parent.__value__;
}
