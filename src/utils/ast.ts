import Path from "path";
import { readFile, getFilePath } from "./readFile";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from '@babel/types';
import { ParsedResult, ParsedResultMore } from "../typings";
import ts from "typescript";
import fs from "fs";
import generate from "@babel/generator";
import { mergeIntervals } from "./merge";
import path from "path";
import { localPath } from "./const";

class AstController {
    baseUrl: string = ""
    tsConfigPath: string = ""
    fileMap: Map<string, ParsedResult> = new Map<string, ParsedResult>()
    fileMapMore: Map<string, ParsedResultMore[]> = new Map<string, ParsedResultMore[]>()

    constructor(baseUrl: string) {
        const url = path.resolve(localPath, baseUrl)
        const tsConfigPath = path.resolve(url , "./tsconfig.json")
        this.baseUrl = url
        this.tsConfigPath = tsConfigPath
    }

    getTsConfigPaths= ()=>{
        const configFile = ts.readConfigFile(this.tsConfigPath, ts.sys.readFile);
        const configParseResult = ts.parseJsonConfigFileContent(configFile.config, ts.sys, Path.dirname(this.tsConfigPath));
        return configParseResult.options.paths || {};
    }

    resolveImportPath = (importPath: string, filePath: string) => {
        const baseUrl = this.baseUrl
        const tsConfig = this.getTsConfigPaths()
        // 处理路径别名
        for (const [alias, aliasPaths] of Object.entries(tsConfig)) {
            const aliasPattern = alias.replace('*', '');
            if ((alias.includes("*") && importPath.startsWith(aliasPattern) || (!alias.includes("*") && importPath === alias))) {
                const relativePath = importPath.replace(aliasPattern, aliasPaths[0].replace('*', ''));
                return getFilePath(Path.resolve(baseUrl, relativePath));
            }
        }
        // 处理相对路径
        if (importPath.startsWith('.')) {
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                if (stats.isDirectory()) {
                    return getFilePath(Path.resolve(filePath, importPath));
                } else {
                    return getFilePath(Path.resolve(Path.dirname(filePath), importPath));
                }
            }
        }

        // 处理 Node.js 模块
        try {
            const nodeModulesPath = path.resolve(this.baseUrl, "node_modules")
            return path.resolve(nodeModulesPath, importPath)
        } catch (e) {
            return filePath;
        }
    }

    parseFile = (filePath: string): ParsedResult => {
        const fileMap = this.fileMap
        const absolutePath = Path.resolve(filePath);
        if (this.fileMap.get(absolutePath)) {
            return fileMap.get(absolutePath) as ParsedResult
        }
        const code = readFile(absolutePath) ?? ""
        const ast = parse(code, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx', 'decorators-legacy']
        });

        const imports: ParsedResult["imports"] = [];
        const exports: ParsedResult["exports"] = [];
        const exportDefault: ParsedResult["exportDefault"] = [];
        const variables: ParsedResult["variables"] = [];
        const functions: ParsedResult["functions"] = [];
        const components: ParsedResult["components"] = [];

        function handleCallExpression(node: t.CallExpression) {
            node.arguments.forEach(arg => {
                if (t.isCallExpression(arg)) {
                    handleCallExpression(arg);
                } else if (t.isIdentifier(arg)) {
                    exportDefault.push(arg.name);
                }
            });
        }

        traverse(ast, {
            ImportDeclaration: ({ node }) => {
                const source = node.source.value;
                const sourceAbsolutePath = this.resolveImportPath(source, absolutePath);
                const specifiers = node.specifiers.map(spec => {
                    return {
                        name: spec.local.name,
                        type: spec.type
                    }
                });
                imports.push({
                    source: sourceAbsolutePath,
                    specifiers
                });
            },
            ExportNamedDeclaration: ({ node }) => {
                if (node.declaration) {
                    if (t.isVariableDeclaration(node.declaration)) {
                        node.declaration.declarations.forEach(decl => {
                            if (t.isIdentifier(decl.id)) {
                                exports.push(decl.id.name);
                            }
                        });
                    } else if (t.isFunctionDeclaration(node.declaration) || t.isClassDeclaration(node.declaration)) {
                        if (node.declaration.id) {
                            exports.push(node.declaration.id.name);
                        }
                    }
                } else if (node.specifiers) {
                    if (node.source) {
                        const sourceAbsolutePath = this.resolveImportPath(node.source.value, absolutePath);
                        const specifiers = node.specifiers.map(specifier => {
                            //@ts-ignore
                            const { exported, local } = specifier
                            if (local?.name === "default") {
                                return {
                                    name: (exported as t.Identifier).name,
                                    type: "ImportDefaultSpecifier"
                                }
                            } else {
                                return {
                                    name: (exported as t.Identifier).name,
                                    type: "ImportSpecifier"
                                }
                            }
                        })
                        imports.push({
                            source: sourceAbsolutePath,
                            specifiers
                        })
                    } else {
                        node.specifiers.forEach(spec => {
                            exports.push(spec.exported.type);
                        });
                    }
                }
            },
            ExportDefaultDeclaration({ node }) {
                if (t.isIdentifier(node.declaration)) {
                    exportDefault.push(node.declaration.name);
                } else if (t.isClassDeclaration(node.declaration) || t.isFunctionDeclaration(node.declaration)) {
                    if (node.declaration.id) {
                        exportDefault.push(node.declaration.id.name);
                    }
                } else if (t.isNewExpression(node.declaration) && t.isIdentifier(node.declaration.callee)) {
                    exportDefault.push(node.declaration.callee.name);
                } else if (t.isCallExpression(node.declaration)) {
                    handleCallExpression(node.declaration);
                }
            },
            VariableDeclaration({ node }) {
                node.declarations.forEach(decl => {
                    if (t.isIdentifier(decl.id)) {
                        variables.push(decl.id.name);
                    }
                });
            },
            FunctionDeclaration({ node }) {
                if (node.id) {
                    functions.push(node.id.name);
                }
            },
            ClassDeclaration({ node }) {
                if (node.id) {
                    components.push(node.id.name);
                }
            },
            ArrowFunctionExpression(path) {
                if (t.isVariableDeclarator(path.parent) && t.isIdentifier(path.parent.id)) {
                    functions.push(path.parent.id.name);
                }
            },
            FunctionExpression(path) {
                if (t.isVariableDeclarator(path.parent) && t.isIdentifier(path.parent.id)) {
                    functions.push(path.parent.id.name);
                }
            }
        });

        const result: ParsedResult = {
            imports,
            exports,
            exportDefault,
            variables,
            functions,
            components
        };

        this.fileMap.set(absolutePath, result);

        return result;
    }

    parseFileMore = (filePath: string): ParsedResultMore[] => {
        const fileMapMore = this.fileMapMore
        const absolutePath = Path.resolve(filePath);
        if (this.fileMapMore.get(absolutePath)) {
            return fileMapMore.get(absolutePath) as ParsedResultMore[]
        }
        const code = readFile(absolutePath) ?? ""
        const ast = parse(code, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx', 'decorators-legacy']
        });
        const list: ParsedResultMore[] = [];
        const importList: ParsedResultMore[] = [];

        traverse(ast, {
            ImportDeclaration: ({ node }) => {
                const source = node.source.value;
                const sourceCode = generate(node, {}, code)
                importList.push({
                    name: source,
                    start: node.loc?.start.line,
                    end: node.loc?.end.line,
                    source: sourceCode.code
                });
            },
            VariableDeclaration({ node }) {
                node.declarations.forEach(decl => {
                    if (t.isIdentifier(decl.id)) {
                        if (list.find(item => item.name === (decl.id as t.Identifier).name)) {
                            return
                        }
                        const sourceCode = generate(node, {}, code)
                        list.push({
                            name: decl.id.name,
                            start: node.loc?.start.line,
                            end: node.loc?.end.line,
                            source: sourceCode.code
                        });
                    }
                });
            },
            FunctionDeclaration({ node }) {
                if (node.id) {
                    const sourceCode = generate(node, {}, code)
                    list.push({
                        name: node.id.name,
                        start: node.loc?.start.line,
                        end: node.loc?.end.line,
                        source: sourceCode.code
                    });
                }
            },
            ClassDeclaration({ node }) {
                if (node.id) {
                    const sourceCode = generate(node, {}, code)
                    list.push({
                        name: node.id.name,
                        start: node.loc?.start.line,
                        end: node.loc?.end.line,
                        source: sourceCode.code
                    });
                }
            },
            ArrowFunctionExpression(path) {
                if (t.isVariableDeclarator(path.parent) && t.isIdentifier(path.parent.id)) {
                    if (list.find(item => item.name === ((path.parent as t.VariableDeclarator).id as t.Identifier).name)) {
                        return
                    }
                    const { node } = path
                    const sourceCode = generate(path.parent, {}, code)
                    list.push({
                        name: path.parent.id.name,
                        start: node.loc?.start.line,
                        end: node.loc?.end.line,
                        source: sourceCode.code
                    });
                }
            },
            FunctionExpression(path) {
                if (t.isVariableDeclarator(path.parent) && t.isIdentifier(path.parent.id)) {
                    const { node } = path
                    const sourceCode = generate(path.parent, {}, code)
                    list.push({
                        name: path.parent.id.name,
                        start: node.loc?.start.line,
                        end: node.loc?.end.line,
                        source: sourceCode.code
                    });
                }
            }
        });

    
        const importMergedList = mergeIntervals(importList);
        this.fileMapMore.set(absolutePath, [...importList, ...list]);
        
        return list;
                
    }
}

export default AstController;
