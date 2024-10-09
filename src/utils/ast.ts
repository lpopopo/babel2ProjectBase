import Path from "path";
import { readFile, getFilePath } from "./readFile";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from '@babel/types';
import { ParsedResult } from "../typings";
import ts from "typescript";
import fs from "fs";

class AstController {
    baseUrl: string = ""
    tsConfigPath: string = ""
    fileMap: Map<string, ParsedResult> = new Map<string, ParsedResult>()

    constructor(baseUrl: string, tsConfigPath: string) {
        this.baseUrl = baseUrl
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
            if (importPath.startsWith(aliasPattern)) {
                const relativePath = importPath.replace(aliasPattern, aliasPaths[0].replace('*', ''));
                return getFilePath(Path.resolve(baseUrl, relativePath));
            }
        }

        // 处理相对路径
        if (importPath.startsWith('.')) {
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                if(stats.isDirectory()) {
                    return getFilePath(Path.resolve(filePath, importPath));
                } else {
                    return getFilePath(Path.resolve(Path.dirname(filePath), importPath));
                }
            }
        }

        // 处理 Node.js 模块
        try {
            return getFilePath(require.resolve(importPath, { paths: [baseUrl] }))
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
            plugins: ['typescript', 'jsx']
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
            ExportNamedDeclaration({ node }) {
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
                    node.specifiers.forEach(spec => {
                        exports.push(spec.exported.type);
                    });
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
}

export const routePath = Path.resolve(__dirname, "/Users/liushuai/Desktop/work/connor/packages/app/src/modules/project_manage_v2/pages/List/index.tsx")
const baseUrl = Path.resolve(__dirname, "/Users/liushuai/Desktop/work/connor/packages/app");
const tsConfigPath = Path.resolve(Path.dirname(routePath), '/Users/liushuai/Desktop/work/connor/packages/app/tsconfig.json');

const astController = new AstController(baseUrl, tsConfigPath)

export default astController;