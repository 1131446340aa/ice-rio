import fs from 'fs';
import traverse from 'babel-traverse';
import path from 'path';
import { controllerMethodsMap } from '../util/constants';
// 处理泛型的全局 map
const genericityTypeParamsMap: Record<string, any> = {};

const validatedTypeNodeMap: Record<string, any[]> = {};

// validated 文件被编译后的结果
export let validatedTypeStore: Record<string, any> = {};

/**
 * @description: 解析文件获取 ast
 * @param {string} fileName
 * @return {*}
 */
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

/**
 * @description: 继续 class 中函数的返回值和参数
 * @return {*}
 */
export function generateFinalParams(ast: any, controller: Object) {
  const methods = controllerMethodsMap.get(controller) || new Map();
  let className = '';
  traverse(ast, {
    ClassMethod(n: any) {
      let methodNode = n.node;
      const leadingComments = methodNode.leadingComments;
      let methodName = methodNode.key.name;
      let returnNodes = methodNode.returnType;
      let u = methods.get(methodName);

      let params = u?.params || [];
      // 如果函数没有参数,则不需要参数校验和生成 api doc,因此可以直接返回
      if (!params.length) return;
      // 只有开启了接口文档才需要解析返回值
      processParams();
      generateDescription(leadingComments, u);

      /**
       * @description: 生成函数的返回值和参数所需的 JSON 对象
       * @return {*}
       */
      function processParams() {
        !returnNodes?.typeAnnotation
          ? console.warn(`${className}.${methodName} : need add return Type`)
          : (u.returnType = generateReturnType(returnNodes.typeAnnotation));

        u.paramsType = getParams({
          node: methodNode,
          nodeType: 'TsMethodParamVale',
          optional: false,
          paramsDecorate: params.map((i: any) => i.decorateType)
        });
      }

      /**
       * @description: 生成函数的返回值类型
       * @return {*}
       */
      function generateReturnType(node: any) {
        if (node.typeName.name !== 'Promise') {
          throw new Error(
            `${className}.${methodName} 的返回值类型必须是 Promise `
          );
        }

        const PromiseNode = node.typeParameters.params[0];
        return getParams({ node: PromiseNode });
      }
      /**
       * @description: 生成 api doc 的描述
       * @param {any} leadingComments
       * @param {any} u
       * @return {*}
       */
      function generateDescription(leadingComments: any, u: any) {
        leadingComments?.forEach((i: any) => {
          i.type === 'CommentLine' &&
            (u.methodDescription.description = i.value.trim());
          i.type === 'CommentBlock' &&
            i.value.includes('@description:') &&
            //@ts-ignore
            (u.methodDescription.description = i.value
              .split('@description:')[1]
              .split(`\n`)[0]
              .trim());
        });
      }
    },
    Class(n) {
      className = n.node.id.name;
    }
  });
}

/**
 * @description: 创建一个数组类型
 * @return {*}
 */
export class CreateArrayType {
  __optional__: boolean;
  constructor(public __value__: any, __optional__?: boolean) {
    __optional__ && (this.__optional__ = __optional__);
  }
}

/**
 * @description: 通过文件名获取源代码
 * @param {string} fileName
 * @return {*}
 */
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

/**
 * @description: 通过 ts 的 ast 生成 js 对象，写的有点啰嗦 ^ ^
 * @return {*}
 */
function generateParam({
  node,
  parent,
  key,
  nodeType,
  optional,
  paramsDecorate,
  parentName,
  typeParams
}: IGenerateParams) {
  const TsTypeAnnotationTypeMap = {
    // 只考虑 string、bool、number、object、和外部引用的情况
    // 对象类型,递归即可
    TSTypeLiteral: () =>
      processObject({
        node,
        nodeType,
        parent,
        key,
        optional,
        paramsDecorate,
        parentName,
        typeParams
      }),
    TSArrayType: () => {
      parent = parent[key] = new CreateArrayType('', optional);
      generateParam({
        node: node.elementType,
        parent,
        key: '__value__',
        nodeType: node.elementType.type
      });
    },
    // TSLiteralType:generateParam,
    // 引用文件
    TSTypeReference: () =>
      processTSTypeReference({
        node,
        parent,
        parentName,
        typeParams,
        key,
        nodeType
      }),
    TsMethodParamVale: () =>
      processObject({
        node,
        nodeType,
        parent,
        key,
        optional,
        paramsDecorate,
        parentName,
        typeParams
      }),
    TSInterfaceBody: () => {
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
    },
    TSBooleanKeyword: 'boolean',
    TSStringKeyword: 'string',
    TSNumberKeyword: 'number',
    TSLiteralType: () => processTSLiteralType(node, parent, key, optional),
    TSUnionType: () =>
      processTSUnionType({
        node,
        parent,
        key,
        optional,
        paramsDecorate
      }),
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
    },
    TSAnyKeyword: () => {},
    TSVoidKeyword: () => {}
  };

  //@ts-ignore
  const tsType = TsTypeAnnotationTypeMap[nodeType];
  if (!tsType)
    throw new Error(`在路由的返回或者参数中,不支持使用 ${nodeType} `);
  if (typeof tsType === 'string') {
    // string | bool | number
    parent[key] = `${tsType}${optional ? ' | undefined' : ''}`;
    return;
  }
  tsType();
}

/**
 * @description: 处理对象类型
 * @return {*}
 */
function processObject({
  node,
  nodeType,
  parent,
  key,
  optional,
  paramsDecorate,
  parentName,
  typeParams
}: IGenerateParams) {
  const nodeParamsKeyMap = {
    TsMethodParamVale: 'params',
    TSTypeLiteral: 'members',
    TSInterfaceBody: 'body'
  };
  //@ts-ignore
  const nodeParams = node[nodeParamsKeyMap[nodeType]];
  parent = parent[key] = parent[key] || {};
  if (optional) parent['__optional__'] = true;

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

/**
 * @description: 处理字面量类型
 * @return {*}
 */
function processTSLiteralType(
  node: any,
  parent: Record<string, any>,
  key: string,
  optional: boolean
) {
  let type = typeof node.literal.value;
  parent[key] = `${type}${optional ? ' | undefined' : ''}`;
}

/**
 * @description: 处理联合类型
 * @return {*}
 */
function processTSUnionType({
  node,
  parent,
  key,
  optional,
  paramsDecorate
}: IGenerateParams) {
  node = node.types[0];
  const nodeType = node.type;
  generateParam({
    node,
    parent,
    key,
    nodeType,
    optional,
    paramsDecorate
  });
}

/**
 * @description: 解析 validated 文件
 * @return {*}
 */
export function getValidatedTypeStore(interfaceFileName: string) {
  let validatedTypeAst;
  try {
    validatedTypeAst = parse(interfaceFileName);
  } catch {}
  if (validatedTypeAst) {
    traverse(validatedTypeAst, {
      enter(path: any) {
        initValidatedTypeNodeMap();
        /**
         * @description: 找出 validated 文件中所有 interface、enum、type 并将其以 map 的形式存储在 validatedTypeNodeMap
         * @return {*}
         */
        function initValidatedTypeNodeMap() {
          if (
            [
              'TSEnumDeclaration',
              'TSTypeAliasDeclaration',
              'TSInterfaceDeclaration'
            ].includes(path.node.type)
          ) {
            let node = path.node;
            const key = node.id.name;
            if (!validatedTypeNodeMap[key]) validatedTypeNodeMap[key] = [];
            validatedTypeNodeMap[key].push(node);
          }
        }
      }
    });

    traverseValidatedNode();
    /**
     * @description: 处理继承相关语法
     * @param {any} extend
     * @param {any} key
     * @return {*}
     */

    /**
     * @description: 遍历 validatedNode
     * @return {*}
     */
    function traverseValidatedNode() {
      Object.keys(validatedTypeNodeMap).forEach((key) => {
        processValidatedStoreItem(key);
      });
    }
  }
}

/**
 * @description: 处理每一个 validated 文件中的类型, interface 类型可能被声明多次，所以需要遍历节点
 * @param {string} key
 * @return {*}
 */
function processValidatedStoreItem(key: string) {
  if (!validatedTypeStore[key]) {
    let nodeList = validatedTypeNodeMap[key];
    for (let node of nodeList) {
      processValidatedNodeItem(node);
    }
    return;
  }
  throw new Error(`${key} 暂不支持,请使用 RioType<${key}> 代替`);
}

/**
 * @description: 处理每一个 validated 文件中的每一个变量声明
 * @param {string} key
 * @return {*}
 */
function processValidatedNodeItem(node: any) {
  const nodeMap = {
    TSInterfaceDeclaration: 'body',
    TSTypeAliasDeclaration: 'typeAnnotation'
  };
  let type = node.type;
  let key = node.id.name;
  if (type === 'TSEnumDeclaration') {
    validatedTypeStore[node.id.name] = typeof (
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
    ? (validatedTypeStore[key] = (typeParams: any[]) =>
        getParams({
          node,
          parentName: typeParameters ? key : undefined,
          typeParams
        }))
    : generateParam({
        node,
        parent: validatedTypeStore,
        key,
        nodeType: type,
        parentName: typeParameters ? key : undefined
      });
  extend && processExtend(extend, key);
}

/**
 * @description: 处理引用类型
 * @return {*}
 */
function processTSTypeReference({
  node,
  parentName,
  typeParams,
  key,
  parent,
  nodeType
}: IGenerateParams) {
  const { typeParameters } = node;
  const typeParametersParams = typeParameters?.params;
  const moduleName = node.typeName.name;
  ['Pick', 'Omit', 'Partial', 'Required', 'RioType'].includes(moduleName)
    ? processGlobalReference()
    : parentName
    ? initGenericityTypeValue()
    : writeGenericityTypeValue();

  /**
   * @description: 给泛型赋值
   * @return {*}
   */
  function writeGenericityTypeValue() {
    const isReference = genericityTypeParamsMap?.[moduleName];

    isReference
      ? processReference()
      : (() => {
          !validatedTypeStore[moduleName]
            ? processValidatedStoreItem(moduleName)
            : (parent[key] = validatedTypeStore[moduleName]);
        })();

    function processReference() {
      const typeParams = typeParametersParams?.map((node: any) => {
        let name = node?.typeName?.name;
        if (!name) return getParams({ node });
        if (typeof validatedTypeStore[name] === 'function')
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
      !validatedTypeStore[moduleName]
        ? processValidatedStoreItem(moduleName)
        : (parent[key] = validatedTypeStore[moduleName](typeParams));
    }
  }
  /**
   * @description: 初始化泛型的值
   * @return {*}
   */
  function initGenericityTypeValue() {
    let module = genericityTypeParamsMap?.[parentName]?.[moduleName];
    !typeParams?.length
      ? module?.value && (parent[key] = module['value'])
      : module &&
        (parent[key] = typeParams[module['index']] || module['value']);
  }
  /**
   * @description: 处理 Omit、Pick 等的泛型节点
   * @return {*}
   */
  function processNode() {
    let attrNode = node.typeParameters.params[1];
    let attrKey: string[] = [];
    if (attrNode) {
      attrNode.type === 'TSUnionType'
        ? (attrKey = attrNode.types.map((i: any) => i.literal.value))
        : moduleName !== 'RioType' && (attrKey = [attrNode.literal.value]);
    }
    return { attrNode, attrKey };
  }
  /**
   * @description: 处理一些全局类型,Omit、Pick 等
   * @return {*}
   */
  function processGlobalReference() {
    let { attrNode, attrKey }: { attrNode: any; attrKey: string[] } =
      processNode();
    if (moduleName === 'RioType') {
      if (!attrNode) return;
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
      const globalTypeMap = {
        Required: () => processRequired(i),
        Partial: () => processPartial(i),
        Pick: () => !attrKey.includes(i) && delete parent[key][i],
        Omit: () => attrKey.includes(i) && delete parent[key][i]
      };
      //@ts-ignore
      globalTypeMap[moduleName]();
    });
    /**
     * @description: 处理 processPartial 关键字,为每一个属性增加可选值
     * @param {string} i
     * @return {*}
     */
    function processPartial(i: string) {
      if (
        typeof r['__value__'][i] === 'string' &&
        !parent[key][i].includes('|')
      )
        parent[key][i] = parent[key][i] + ' | undefined';

      if (typeof parent[key][i] === 'object')
        parent[key][i]['__optional__'] = true;
    }

    /**
     * @description: 处理 required 关键字,去掉每一个属性的可选值
     * @param {string} i
     * @return {*}
     */
    function processRequired(i: string) {
      if (typeof parent[key][i] === 'string')
        parent[key][i] = parent[key][i].split(' | ')[0];

      if (typeof parent[key][i] === 'object')
        delete parent[key][i]['__optional__'];
    }
  }
}

class createParent {
  constructor(public __value__?: any) {}
}

/**
 * @description: 获取 generateParam 最终的结果
 * @return {*}
 */
function getParams({
  node,
  parentName,
  typeParams,
  optional,
  paramsDecorate,
  nodeType
}: IGetParam) {
  let parent = new createParent();
  generateParam({
    node,
    nodeType: nodeType || node.type,
    parent,
    key: '__value__',
    parentName,
    typeParams,
    optional,
    paramsDecorate
  });
  return parent.__value__;
}
/**
 * @description: 处理 extends 关键字
 * @param {any} extend
 * @param {any} key
 * @return {*}
 */
function processExtend(extend: any, key: any) {
  for (let node of extend) {
    const moduleName = node.expression.name;
    validatedTypeStore[moduleName];
    !validatedTypeStore[moduleName]
      ? processValidatedStoreItem(moduleName)
      : (validatedTypeStore[key] = {
          ...validatedTypeStore[key],
          ...validatedTypeStore[moduleName]
        });
  }
}
/**
 * @description: 处理泛型的参数
 * @param {any} typeParameters
 * @param {any} node
 * @return {*}
 */
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

interface IGetParam {
  node: any;
  parentName?: string;
  typeParams?: any[];
  optional?: boolean;
  paramsDecorate?: string[];
  nodeType?: string;
}

interface IGenerateParams extends IGetParam {
  parent: any;
  key: string;
}
