import fs from 'fs';
import traverse from 'babel-traverse';
const parser = require('@babel/parser');
import path from 'path';

import {
  typeMap,
  importedControllerMap,
  controllerMethodsReturnMap,
  controllerMethodsDescriptionMap
} from './constants';
import { getControllerResult } from './getControllerResult';
export function parse(fileName: string) {
  const source = fs.readFileSync(fileName, 'utf8');
  const ast = parser.parse(source, {
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

export function generateFinalParams(ast: any, controller: Object, dir: string) {
  const importedMap = importedControllerMap.get(controller) || {};
  const moduleTypeParamsMap: Record<string, any> = {};
  const moduleTypeParamsObjectMap: Record<string, any> = {};
  let className = '';
  function searchDir(pathNode: any, dir: string) {
    for (let i of pathNode.node.specifiers) {
      let p = path.join(dir, pathNode.node.source.value);
      try {
        if (fs.lstatSync(p).isDirectory()) {
          p = path.join(p, '/index.ts');
        }
      } catch {
        p = p + '.ts';
      }
      // 暂不考虑使用绝对路径的引用以及嵌套引用以及循环引用等情况
      i?.imported?.name && (importedMap[i.imported.name] = p);
    }
  }
  traverse(ast, {
    ClassMethod(n: any) {
      let methodNode = n.node;
      const leadingComments = methodNode.leadingComments;
      let methodName = methodNode.key.name;
      let returnNodes = methodNode.returnType;
      function resolveReference({
        node,
        parent,
        key,
        nodeType
      }: {
        node: any;
        parent: Record<string, any>;
        key: string;
        nodeType: string;
      }) {
        const referenceName = node?.typeName?.name || node.expression.name;
        const fileName = importedMap[referenceName];
        const dir = fileName.slice(0, fileName.lastIndexOf('/'));
        const referenceAst = parse(fileName);
        traverse(referenceAst, {
          ExportNamedDeclaration(path: any) {
            const moduleName = path.node.declaration.id.name;
            const declaration = path.node.declaration;
            const { typeParameters, extends: extend } = declaration;
           
            const type = declaration.type;
            const nodeMap = {
              TSTypeAliasDeclaration: declaration?.typeAnnotation,
              TSInterfaceDeclaration: declaration?.body
            };
            //@ts-ignore
            const node = nodeMap[type];
            if (!node) {
              throw new Error(`External references only support interfaces and types in the params or return of ${className}.${methodName}`);
            }
            nodeType = node.type;
            if (referenceName === moduleName) {
              const ret = {};
              if (typeParameters) {
                typeParameters.params?.forEach((i: any, index: number) => {
                  //@ts-ignore
                  ret[i.name] = moduleTypeParamsMap[moduleName][index];
                });
              }
              moduleTypeParamsObjectMap[moduleName] = ret;
              generateParam({
                node,
                parent,
                key,
                nodeType,
                parentModuleName: typeParameters ? moduleName : undefined
              });
              if (extend) {
                for (let node of extend) {
                  let r: Record<string, any> = {};
                  resolveReference({ node, parent: r, key: 'value', nodeType });
                  Object.keys(r.value).forEach((i) => {
                    parent[key][i] = r.value[i];
                  });
                }
              }
            }
          },
          ImportDeclaration(pathNode: any) {
            searchDir(pathNode, dir);
          }
        });
      }
      function generateParam({
        node,
        parent,
        key,
        nodeType,
        parentModuleName,
        optional
      }: {
        node: any;
        parent: Record<string, any>;
        key: string;
        nodeType: string;
        parentModuleName?: string;
        optional?: boolean;
      }) {
        const TsTypeAnnotationTypeMap = {
          // 只考虑 string、bool、number、object、和外部引用的情况
          // 对象类型,递归即可
          TSTypeLiteral: generateParam,

          TSArrayType: generateParam,
          // TSLiteralType:generateParam,
          // 引用文件
          TSTypeReference: resolveReference,
          TsMethodParamVale: generateParam,
          TSInterfaceBody: generateParam,
          TSBooleanKeyword: 'boolean',
          TSStringKeyword: 'string',
          TSNumberKeyword: 'number'
        };
        //@ts-ignore
        const t = TsTypeAnnotationTypeMap[nodeType];
        if (!t) {
          throw new Error(`the type ${nodeType} in the params or return of ${className}.${methodName} does not support`);
        }
        if (typeof t === 'string') {
          parent[key] = optional ? t + ' | ' + 'undefined' : t;
        } else if (typeof t === 'function') {
          if (optional) {
            throw new Error(`the object in the params or return of ${className}.${methodName} does not support optional`);
          }
          const nodeParamsKeyMap = {
            TsMethodParamVale: 'params',
            TSTypeLiteral: 'members',
            TSInterfaceBody: 'body'
          };
          const { typeParameters } = node;
          const typeParametersParams = typeParameters?.params;
          if (node.type === 'TSArrayType') {
            parent = parent[key] = new CreateArrayType('');
            t({
              node: node.elementType,
              parent,
              key: '__value__',
              nodeType: node.elementType.type
            });
          } else {
            //@ts-ignore
            const nodeParams = node[nodeParamsKeyMap[nodeType]];

            if (nodeType === 'TSTypeReference') {
              const moduleName = node.typeName.name;
              if (
                parentModuleName &&
                moduleTypeParamsObjectMap[parentModuleName][moduleName]
              ) {
                const node =
                  moduleTypeParamsObjectMap[parentModuleName][moduleName];
                const nodeType = node.type;
                generateParam({ node, nodeType, key, parent });
              } else {
                typeParametersParams &&
                  //@ts-ignore
                  (moduleTypeParamsMap[moduleName] = typeParametersParams);
                t({ node, nodeType, key, parent });
              }
            } else {
              parent = parent[key] = {};
              for (let nodeParam of nodeParams) {
                node = nodeParam?.typeAnnotation?.typeAnnotation;
                optional = nodeParam.optional;
                key =
                  nodeParam.type === 'TSPropertySignature'
                    ? nodeParam.key.name
                    : nodeParam.name;
                nodeType = node.type;
                t({ node, nodeType, key, parent, parentModuleName, optional });
              }
            }
          }
        }
      }
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
          throw new Error(`the return of ${className}.${methodName} must be Promise`);
        }
        //@ts-ignore
        return result.value;
      }
      let { result, controller: controllerMethod } = getControllerResult(
        controllerMethodsReturnMap,
        controller,
        methodName,
        {}
      );
      if (!returnNodes.typeAnnotation) {
        console.warn(`${methodName} : need add return Type`);
      }
      returnNodes.typeAnnotation &&
        (result = generateReturnType(returnNodes.typeAnnotation, result));
      controllerMethod.set(methodName, result);
      let r = {};
      generateParam({
        node: methodNode,
        parent: r,
        key: 'value',
        nodeType: 'TsMethodParamVale',
        optional: false
      });
      //@ts-ignore
      typeMap.get(controller).set(methodName, r.value);
      let description = '';
      const { controller: descriptionMap } = getControllerResult(
        controllerMethodsDescriptionMap,
        controller,
        methodName,
        ''
      );
      leadingComments?.forEach((i: any) => {
        if (i.value.includes('@description:')) {
          description = i.value.split('@description:')[1].split(`\n`)[0].trim();
        }
      });
      descriptionMap.set(methodName, description);
    },
    ImportDeclaration(pathNode: any) {
      searchDir(pathNode, dir);
    },
    Class(n) {
      className = n.node.id.name;
    }
  });
}

export class CreateArrayType {
  constructor(public __value__: any) {}
}
