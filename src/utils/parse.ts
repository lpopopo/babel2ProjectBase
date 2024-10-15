import Path from 'path';
import { readFile } from './readFile';
import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

function extractFinalArguments(arg: t.ArgumentPlaceholder | t.SpreadElement | t.Expression): Array<string> {
    if (arg.type === 'CallExpression') {
        return arg.arguments.map(extractFinalArguments).flat();
    } else if (arg.type === 'Identifier') {
        return [arg.name];
    } else {
        // 处理其他类型的节点
        return [];
    }
}

interface NamedItem {
    name?: string;
}

const removeDuplicates = (array: NamedItem[]): NamedItem[] => {
    const seen = new Set<string>();
    return array.filter(item => {
        if (item.name && seen.has(item.name)) {
            return false;
        } else {
            item.name && seen.add(item.name);
            return true;
        }
    });
};

const parseReactComponent = (filePath: string, componentName: string): { externalComponents: Array<{ name?: string }>, externalFunctions: Array<{ name?: string }> } => {
    const absolutePath = Path.resolve(filePath);
    const code = readFile(absolutePath, 'utf-8') ?? "";
    const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
    });

    // 存储外部调用的组件
    const Components: Array<{ name?: string }> = [];
    const functionDeclarations: Array<{ name?: string }> = [];
    const functionCalls: Array<{ name?: string }> = [];

    const parseCallExpression = (path: NodePath<t.CallExpression>): void => {
        const { node } = path;
        // 记录函数调用
        if (node.callee.type === 'Identifier') {
            //@ts-ignore
            if (typeof global[node.callee.name] === 'function') {
                return;
            }
            let currentPath: any = path;
            while (currentPath?.parent) {
                currentPath = currentPath.parentPath;
                if (currentPath?.node?.callee?.name === 'Promise') {
                    return
                }
            }
            functionCalls.push({
                name: node.callee.name,
            });
            node.arguments.forEach(arg => {
                const finalArgs = extractFinalArguments(arg);
                finalArgs.forEach(arg => {
                    functionCalls.push({
                        name: arg,
                    });
                })
            });
        } else if (node.callee.type === "MemberExpression") {
            const { object, property } = node.callee;
            if (
                object.type === "Identifier"
            ) {
                //@ts-ignore
                if (typeof global[object.name] === 'object' && typeof global[object.name][property.name] === 'function') {
                    return;
                }
                functionCalls.push({
                    name: object.name,
                });
            }
        }
    };

    traverse(ast, {
        ClassDeclaration(path) {
            const { node } = path
            if (node.id && node.id.name === componentName) {
                path.traverse({
                    FunctionDeclaration({ node }) {
                        // 记录函数声明
                        functionDeclarations.push({
                            name: node?.id?.name,
                        });
                    },
                    VariableDeclaration({ node }) {
                        // 记录变量声明
                        if (node.declarations && node.declarations.length > 0) {
                            node.declarations.forEach(decl => {
                                if (t.isVariableDeclarator(decl) && t.isIdentifier(decl.id)) {
                                    functionDeclarations.push({
                                        name: decl.id.name,
                                    });

                                }
                            });
                        }
                    },
                    FunctionExpression({ node, parent }) {
                        // 记录函数表达式（包括箭头函数）
                        if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
                            functionDeclarations.push({
                                name: parent.id.name,
                            });
                        }
                    },
                    CallExpression(path) {
                        parseCallExpression(path);
                    },
                    JSXIdentifier({ node, parent }) {
                        // 检查 JSX 元素是否是外部组件
                        if (/^[a-z]/.test(node.name)) {
                            return
                        }
                        Components.push({
                            name: node.name,
                        });
                    }
                })
            }
        },
        //处理函数组件
        FunctionDeclaration(path) {
            const { node } = path
            if (node.id && node.id.name === componentName) {
                path.traverse({
                    FunctionDeclaration({ node }) {
                        // 记录函数声明
                        functionDeclarations.push({
                            name: node?.id?.name,
                        });
                    },
                    VariableDeclaration({ node }) {
                        // 记录变量声明
                        if (node.declarations && node.declarations.length > 0) {
                            node.declarations.forEach(decl => {
                                if (t.isVariableDeclarator(decl) && t.isIdentifier(decl.id)) {
                                    functionDeclarations.push({
                                        name: decl.id.name,
                                    });

                                }
                            });
                        }
                    },
                    FunctionExpression({ node, parent }) {
                        // 记录函数表达式（包括箭头函数）
                        if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
                            functionDeclarations.push({
                                name: parent.id.name,
                            });
                        }
                    },
                    CallExpression(path) {
                        parseCallExpression(path);
                    },
                    JSXIdentifier({ node, parent }) {
                        // 检查 JSX 元素是否是外部组件
                        if (/^[a-z]/.test(node.name)) {
                            return
                        }
                        Components.push({
                            name: node.name,
                        });
                    }
                })
            }
        },
        /**
         * const a = ()=>{}
         */
        VariableDeclaration(path) {
            const { node } = path
            if (node.declarations && node.declarations.length > 0) {
                node.declarations.forEach(decl => {
                    if (t.isVariableDeclarator(decl) && t.isIdentifier(decl.id)) {
                        if (decl.id.name === componentName) {
                            path.traverse({
                                FunctionDeclaration({ node }) {
                                    // 记录函数声明
                                    functionDeclarations.push({
                                        name: node?.id?.name,
                                    });
                                },
                                VariableDeclaration({ node }) {
                                    // 记录变量声明
                                    if (node.declarations && node.declarations.length > 0) {
                                        node.declarations.forEach(decl => {
                                            if (t.isVariableDeclarator(decl) && t.isIdentifier(decl.id)) {
                                                functionDeclarations.push({
                                                    name: decl.id.name,
                                                });

                                            }
                                        });
                                    }
                                },
                                FunctionExpression({ node, parent }) {
                                    // 记录函数表达式（包括箭头函数）
                                    if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
                                        functionDeclarations.push({
                                            name: parent.id.name,
                                        });
                                    }
                                },
                                CallExpression(path) {
                                    parseCallExpression(path);
                                },
                                JSXIdentifier({ node, parent }) {
                                    // 检查 JSX 元素是否是外部组件
                                    if (/^[a-z]/.test(node.name)) {
                                        return
                                    }
                                    Components.push({
                                        name: node.name,
                                    });
                                }
                            })
                        }
                    }
                })
            }
        }
    })

    const externalComponents = removeDuplicates(Components.filter(item => !functionDeclarations.some(fn => fn.name === item.name)))
    const externalFunctions = removeDuplicates(functionCalls.filter(item => !functionDeclarations.some(fn => fn.name === item.name)))

    return {
        externalComponents,
        externalFunctions,
    }
}


export default parseReactComponent