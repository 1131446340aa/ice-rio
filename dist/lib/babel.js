"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValidatedTypeStore = exports.CreateArrayType = exports.generateFinalParams = exports.parse = exports.validatedTypeStore = void 0;
const fs_1 = __importDefault(require("fs"));
const babel_traverse_1 = __importDefault(require("babel-traverse"));
const constants_1 = require("../util/constants");
const genericityTypeParamsMap = {};
const validatedTypeNodeMap = {};
exports.validatedTypeStore = {};
function parse(fileName) {
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
exports.parse = parse;
function generateFinalParams(ast, controller) {
    const methods = constants_1.controllerMethodsMap.get(controller) || new Map();
    let className = '';
    (0, babel_traverse_1.default)(ast, {
        ClassMethod(n) {
            let methodNode = n.node;
            const leadingComments = methodNode.leadingComments;
            let methodName = methodNode.key.name;
            let returnNodes = methodNode.returnType;
            let u = methods.get(methodName);
            let params = (u === null || u === void 0 ? void 0 : u.params) || [];
            if (!params.length)
                return;
            processParams();
            generateDescription(leadingComments, u);
            function processParams() {
                !(returnNodes === null || returnNodes === void 0 ? void 0 : returnNodes.typeAnnotation)
                    ? console.warn(`${className}.${methodName} : need add return Type`)
                    : (u.returnType = generateReturnType(returnNodes.typeAnnotation));
                u.paramsType = getParams({
                    node: methodNode,
                    nodeType: 'TsMethodParamVale',
                    optional: false,
                    paramsDecorate: params.map((i) => i.decorateType)
                });
            }
            function generateReturnType(node) {
                if (node.typeName.name !== 'Promise') {
                    throw new Error(`${className}.${methodName} 的返回值类型必须是 Promise `);
                }
                const PromiseNode = node.typeParameters.params[0];
                return getParams({ node: PromiseNode });
            }
            function generateDescription(leadingComments, u) {
                leadingComments === null || leadingComments === void 0 ? void 0 : leadingComments.forEach((i) => {
                    i.type === 'CommentLine' &&
                        (u.methodDescription.description = i.value.trim());
                    i.type === 'CommentBlock' &&
                        i.value.includes('@description:') &&
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
exports.generateFinalParams = generateFinalParams;
class CreateArrayType {
    constructor(__value__, __optional__) {
        this.__value__ = __value__;
        __optional__ && (this.__optional__ = __optional__);
    }
}
exports.CreateArrayType = CreateArrayType;
function getSourceFile(fileName) {
    let source = '';
    for (let i of ['', '.ts', '.d.ts']) {
        try {
            source = fs_1.default.readFileSync(fileName + i, 'utf8');
            break;
        }
        catch (_a) { }
    }
    return source;
}
function generateParam({ node, parent, key, nodeType, optional, paramsDecorate, parentName, typeParams }) {
    const TsTypeAnnotationTypeMap = {
        TSTypeLiteral: () => processObject({
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
        TSTypeReference: () => processTSTypeReference({
            node,
            parent,
            parentName,
            typeParams,
            key,
            nodeType
        }),
        TsMethodParamVale: () => processObject({
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
        TSUnionType: () => processTSUnionType({
            node,
            parent,
            key,
            optional,
            paramsDecorate
        }),
        TSIntersectionType: () => {
            node.types.forEach((node) => {
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
        TSAnyKeyword: () => { },
        TSVoidKeyword: () => { }
    };
    const tsType = TsTypeAnnotationTypeMap[nodeType];
    if (!tsType)
        throw new Error(`在路由的返回或者参数中,不支持使用 ${nodeType} `);
    if (typeof tsType === 'string') {
        parent[key] = `${tsType}${optional ? ' | undefined' : ''}`;
        return;
    }
    tsType();
}
function processObject({ node, nodeType, parent, key, optional, paramsDecorate, parentName, typeParams }) {
    var _a;
    const nodeParamsKeyMap = {
        TsMethodParamVale: 'params',
        TSTypeLiteral: 'members',
        TSInterfaceBody: 'body'
    };
    const nodeParams = node[nodeParamsKeyMap[nodeType]];
    parent = parent[key] = parent[key] || {};
    if (optional)
        parent['__optional__'] = true;
    for (let i = 0; i < nodeParams.length; i++) {
        if (paramsDecorate && !paramsDecorate[i])
            continue;
        let nodeParam = nodeParams[i];
        node = (_a = nodeParam === null || nodeParam === void 0 ? void 0 : nodeParam.typeAnnotation) === null || _a === void 0 ? void 0 : _a.typeAnnotation;
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
function processTSLiteralType(node, parent, key, optional) {
    let type = typeof node.literal.value;
    parent[key] = `${type}${optional ? ' | undefined' : ''}`;
}
function processTSUnionType({ node, parent, key, optional, paramsDecorate }) {
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
function getValidatedTypeStore(interfaceFileName) {
    let validatedTypeAst;
    try {
        validatedTypeAst = parse(interfaceFileName);
    }
    catch (_a) { }
    if (validatedTypeAst) {
        (0, babel_traverse_1.default)(validatedTypeAst, {
            enter(path) {
                initValidatedTypeNodeMap();
                function initValidatedTypeNodeMap() {
                    if ([
                        'TSEnumDeclaration',
                        'TSTypeAliasDeclaration',
                        'TSInterfaceDeclaration'
                    ].includes(path.node.type)) {
                        let node = path.node;
                        const key = node.id.name;
                        if (!validatedTypeNodeMap[key])
                            validatedTypeNodeMap[key] = [];
                        validatedTypeNodeMap[key].push(node);
                    }
                }
            }
        });
        traverseValidatedNode();
        function traverseValidatedNode() {
            Object.keys(validatedTypeNodeMap).forEach((key) => {
                processValidatedStoreItem(key);
            });
        }
    }
}
exports.getValidatedTypeStore = getValidatedTypeStore;
function processValidatedStoreItem(key) {
    if (!exports.validatedTypeStore[key]) {
        let nodeList = validatedTypeNodeMap[key];
        for (let node of nodeList) {
            processValidatedNodeItem(node);
        }
        return;
    }
    throw new Error(`${key} 暂不支持,请使用 RioType<${key}> 代替`);
}
function processValidatedNodeItem(node) {
    var _a, _b;
    const nodeMap = {
        TSInterfaceDeclaration: 'body',
        TSTypeAliasDeclaration: 'typeAnnotation'
    };
    let type = node.type;
    let key = node.id.name;
    if (type === 'TSEnumDeclaration') {
        exports.validatedTypeStore[node.id.name] = typeof (((_b = (_a = node === null || node === void 0 ? void 0 : node[0]) === null || _a === void 0 ? void 0 : _a.initializer) === null || _b === void 0 ? void 0 : _b.value) || 0);
        return;
    }
    const { typeParameters, extends: extend } = node;
    typeParameters && processGenericityParams(typeParameters, node);
    node = node[nodeMap[type]];
    type = node.type;
    typeParameters
        ? (exports.validatedTypeStore[key] = (typeParams) => getParams({
            node,
            parentName: typeParameters ? key : undefined,
            typeParams
        }))
        : generateParam({
            node,
            parent: exports.validatedTypeStore,
            key,
            nodeType: type,
            parentName: typeParameters ? key : undefined
        });
    extend && processExtend(extend, key);
}
function processTSTypeReference({ node, parentName, typeParams, key, parent, nodeType }) {
    const { typeParameters } = node;
    const typeParametersParams = typeParameters === null || typeParameters === void 0 ? void 0 : typeParameters.params;
    const moduleName = node.typeName.name;
    ['Pick', 'Omit', 'Partial', 'Required', 'RioType'].includes(moduleName)
        ? processGlobalReference()
        : parentName
            ? initGenericityTypeValue()
            : writeGenericityTypeValue();
    function writeGenericityTypeValue() {
        const isReference = genericityTypeParamsMap === null || genericityTypeParamsMap === void 0 ? void 0 : genericityTypeParamsMap[moduleName];
        isReference
            ? processReference()
            : (() => {
                !exports.validatedTypeStore[moduleName]
                    ? processValidatedStoreItem(moduleName)
                    : (parent[key] = exports.validatedTypeStore[moduleName]);
            })();
        function processReference() {
            const typeParams = typeParametersParams === null || typeParametersParams === void 0 ? void 0 : typeParametersParams.map((node) => {
                var _a;
                let name = (_a = node === null || node === void 0 ? void 0 : node.typeName) === null || _a === void 0 ? void 0 : _a.name;
                if (!name)
                    return getParams({ node });
                if (typeof exports.validatedTypeStore[name] === 'function')
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
            !exports.validatedTypeStore[moduleName]
                ? processValidatedStoreItem(moduleName)
                : (parent[key] = exports.validatedTypeStore[moduleName](typeParams));
        }
    }
    function initGenericityTypeValue() {
        var _a;
        let module = (_a = genericityTypeParamsMap === null || genericityTypeParamsMap === void 0 ? void 0 : genericityTypeParamsMap[parentName]) === null || _a === void 0 ? void 0 : _a[moduleName];
        !(typeParams === null || typeParams === void 0 ? void 0 : typeParams.length)
            ? (module === null || module === void 0 ? void 0 : module.value) && (parent[key] = module['value'])
            : module &&
                (parent[key] = typeParams[module['index']] || module['value']);
    }
    function processNode() {
        let attrNode = node.typeParameters.params[1];
        let attrKey = [];
        if (attrNode) {
            attrNode.type === 'TSUnionType'
                ? (attrKey = attrNode.types.map((i) => i.literal.value))
                : moduleName !== 'RioType' && (attrKey = [attrNode.literal.value]);
        }
        return { attrNode, attrKey };
    }
    function processGlobalReference() {
        let { attrNode, attrKey } = processNode();
        if (moduleName === 'RioType') {
            if (!attrNode)
                return;
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
            globalTypeMap[moduleName]();
        });
        function processPartial(i) {
            if (typeof r['__value__'][i] === 'string' &&
                !parent[key][i].includes('|'))
                parent[key][i] = parent[key][i] + ' | undefined';
            if (typeof parent[key][i] === 'object')
                parent[key][i]['__optional__'] = true;
        }
        function processRequired(i) {
            if (typeof parent[key][i] === 'string')
                parent[key][i] = parent[key][i].split(' | ')[0];
            if (typeof parent[key][i] === 'object')
                delete parent[key][i]['__optional__'];
        }
    }
}
class createParent {
    constructor(__value__) {
        this.__value__ = __value__;
    }
}
function getParams({ node, parentName, typeParams, optional, paramsDecorate, nodeType }) {
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
function processExtend(extend, key) {
    for (let node of extend) {
        const moduleName = node.expression.name;
        exports.validatedTypeStore[moduleName];
        !exports.validatedTypeStore[moduleName]
            ? processValidatedStoreItem(moduleName)
            : (exports.validatedTypeStore[key] = Object.assign(Object.assign({}, exports.validatedTypeStore[key]), exports.validatedTypeStore[moduleName]));
    }
}
function processGenericityParams(typeParameters, node) {
    var _a;
    (_a = typeParameters.params) === null || _a === void 0 ? void 0 : _a.forEach((i, index) => {
        let r = {};
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
            value: r.value
        };
    });
}
