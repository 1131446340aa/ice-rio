"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateArrayType = exports.generateFinalParams = exports.parse = void 0;
const fs_1 = __importDefault(require("fs"));
const babel_traverse_1 = __importDefault(require("babel-traverse"));
const parser = require('@babel/parser');
const path_1 = __importDefault(require("path"));
const constants_1 = require("./constants");
const getControllerResult_1 = require("./getControllerResult");
function parse(fileName) {
    const source = fs_1.default.readFileSync(fileName, 'utf8');
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
exports.parse = parse;
function generateFinalParams(ast, controller, dir) {
    const importedMap = constants_1.importedControllerMap.get(controller) || {};
    const moduleTypeParamsMap = {};
    const moduleTypeParamsObjectMap = {};
    let className = '';
    function searchDir(pathNode, dir) {
        var _a;
        for (let i of pathNode.node.specifiers) {
            let p = path_1.default.join(dir, pathNode.node.source.value);
            try {
                if (fs_1.default.lstatSync(p).isDirectory()) {
                    p = path_1.default.join(p, '/index.ts');
                }
            }
            catch (_b) {
                p = p + '.ts';
            }
            ((_a = i === null || i === void 0 ? void 0 : i.imported) === null || _a === void 0 ? void 0 : _a.name) && (importedMap[i.imported.name] = p);
        }
    }
    babel_traverse_1.default(ast, {
        ClassMethod(n) {
            let methodNode = n.node;
            const leadingComments = methodNode.leadingComments;
            let methodName = methodNode.key.name;
            let returnNodes = methodNode.returnType;
            function resolveReference({ node, parent, key, nodeType }) {
                var _a;
                const referenceName = ((_a = node === null || node === void 0 ? void 0 : node.typeName) === null || _a === void 0 ? void 0 : _a.name) || node.expression.name;
                const fileName = importedMap[referenceName];
                const dir = fileName.slice(0, fileName.lastIndexOf('/'));
                const referenceAst = parse(fileName);
                babel_traverse_1.default(referenceAst, {
                    ExportNamedDeclaration(path) {
                        var _a;
                        const moduleName = path.node.declaration.id.name;
                        const declaration = path.node.declaration;
                        const { typeParameters, extends: extend } = declaration;
                        const type = declaration.type;
                        const nodeMap = {
                            TSTypeAliasDeclaration: declaration === null || declaration === void 0 ? void 0 : declaration.typeAnnotation,
                            TSInterfaceDeclaration: declaration === null || declaration === void 0 ? void 0 : declaration.body
                        };
                        const node = nodeMap[type];
                        if (!node) {
                            throw new Error(`External references only support interfaces and types in the params or return of ${className}.${methodName}`);
                        }
                        nodeType = node.type;
                        if (referenceName === moduleName) {
                            const ret = {};
                            if (typeParameters) {
                                (_a = typeParameters.params) === null || _a === void 0 ? void 0 : _a.forEach((i, index) => {
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
                                    let r = {};
                                    resolveReference({ node, parent: r, key: 'value', nodeType });
                                    Object.keys(r.value).forEach((i) => {
                                        parent[key][i] = r.value[i];
                                    });
                                }
                            }
                        }
                    },
                    ImportDeclaration(pathNode) {
                        searchDir(pathNode, dir);
                    }
                });
            }
            function generateParam({ node, parent, key, nodeType, parentModuleName, optional }) {
                var _a;
                const TsTypeAnnotationTypeMap = {
                    TSTypeLiteral: generateParam,
                    TSArrayType: generateParam,
                    TSTypeReference: resolveReference,
                    TsMethodParamVale: generateParam,
                    TSInterfaceBody: generateParam,
                    TSBooleanKeyword: 'boolean',
                    TSStringKeyword: 'string',
                    TSNumberKeyword: 'number'
                };
                const t = TsTypeAnnotationTypeMap[nodeType];
                if (!t) {
                    throw new Error(`the type ${nodeType} in the params or return of ${className}.${methodName} does not support`);
                }
                if (typeof t === 'string') {
                    parent[key] = optional ? t + ' | ' + 'undefined' : t;
                }
                else if (typeof t === 'function') {
                    if (optional) {
                        throw new Error(`the object in the params or return of ${className}.${methodName} does not support optional`);
                    }
                    const nodeParamsKeyMap = {
                        TsMethodParamVale: 'params',
                        TSTypeLiteral: 'members',
                        TSInterfaceBody: 'body'
                    };
                    const { typeParameters } = node;
                    const typeParametersParams = typeParameters === null || typeParameters === void 0 ? void 0 : typeParameters.params;
                    if (node.type === 'TSArrayType') {
                        parent = parent[key] = new CreateArrayType('');
                        t({
                            node: node.elementType,
                            parent,
                            key: '__value__',
                            nodeType: node.elementType.type
                        });
                    }
                    else {
                        const nodeParams = node[nodeParamsKeyMap[nodeType]];
                        if (nodeType === 'TSTypeReference') {
                            const moduleName = node.typeName.name;
                            if (parentModuleName &&
                                moduleTypeParamsObjectMap[parentModuleName][moduleName]) {
                                const node = moduleTypeParamsObjectMap[parentModuleName][moduleName];
                                const nodeType = node.type;
                                generateParam({ node, nodeType, key, parent });
                            }
                            else {
                                typeParametersParams &&
                                    (moduleTypeParamsMap[moduleName] = typeParametersParams);
                                t({ node, nodeType, key, parent });
                            }
                        }
                        else {
                            parent = parent[key] = {};
                            for (let nodeParam of nodeParams) {
                                node = (_a = nodeParam === null || nodeParam === void 0 ? void 0 : nodeParam.typeAnnotation) === null || _a === void 0 ? void 0 : _a.typeAnnotation;
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
            function generateReturnType(node, result = {}) {
                if (node.typeName.name === 'Promise') {
                    const PromiseNode = node.typeParameters.params[0];
                    generateParam({
                        node: PromiseNode,
                        parent: result,
                        key: 'value',
                        nodeType: PromiseNode.type
                    });
                }
                else {
                    throw new Error(`the return of ${className}.${methodName} must be Promise`);
                }
                return result.value;
            }
            let { result, controller: controllerMethod } = getControllerResult_1.getControllerResult(constants_1.controllerMethodsReturnMap, controller, methodName, {});
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
            constants_1.typeMap.get(controller).set(methodName, r.value);
            let description = '';
            const { controller: descriptionMap } = getControllerResult_1.getControllerResult(constants_1.controllerMethodsDescriptionMap, controller, methodName, '');
            leadingComments === null || leadingComments === void 0 ? void 0 : leadingComments.forEach((i) => {
                if (i.value.includes('@description:')) {
                    description = i.value.split('@description:')[1].split(`\n`)[0].trim();
                }
            });
            descriptionMap.set(methodName, description);
        },
        ImportDeclaration(pathNode) {
            searchDir(pathNode, dir);
        },
        Class(n) {
            className = n.node.id.name;
        }
    });
}
exports.generateFinalParams = generateFinalParams;
class CreateArrayType {
    constructor(__value__) {
        this.__value__ = __value__;
    }
}
exports.CreateArrayType = CreateArrayType;
