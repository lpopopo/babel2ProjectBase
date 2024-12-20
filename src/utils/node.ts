import AstController from "./ast"
import parseFile from "./ast"
import parseReactComponent from "./parse"

enum NODE_TYPE {
    NONE = "",
    UI_COMPONENT = "ui_component",
    FUNCTION = "function",
    CSS = "css"
}

class Node {
    /**
     * 文件绝对路径
     */
    source: string = ""
    sourceCode?: string = ""
    /**
     * 函数/组件名
     */
    name: string = ""
    nodeType: NODE_TYPE = NODE_TYPE.NONE;
    /**
     * 引用的外部组件
     */
    isImport: boolean = false
    importType: string = ""

    children: Array<Node> = []

    constructor(isImport: boolean = false, type?: string) {
        this.isImport = isImport
        this.importType = type ?? ""
    }

    generateLinks(astController: AstController) {
        if (!this.name || !this.source || this.source.includes("node_modules")) {
            return
        }
        let fileContent = astController.parseFile(this.source)
        const { imports, exportDefault, variables, functions } = fileContent
        /**
         * 处理只是把组件import在直接export的情况
         */
        if (imports.some(item => {
            return item.specifiers.find(sp => sp.name === this.name)
        })) {
            const importSpecifier = imports.find(im => im.specifiers.find(sp => sp.name === this.name))
            this.source = importSpecifier?.source ?? ""
            this.importType = importSpecifier?.specifiers?.[0].type ?? this.importType
            this.generateLinks(astController)
        } else if (this.isImport && this.importType === "ImportDefaultSpecifier" && exportDefault?.[0] !== this.name) {
            /** 
             * export default 
             * import的时候命名可能不太一样
             */
            if (exportDefault?.[0]) {
                this.name = exportDefault[0]
                this.generateLinks(astController)
            }
        } else {
            const {
                externalComponents,
                externalFunctions,
                sourceCode,
                isJsx
            } = parseReactComponent(this.source, this.name) ?? {}
            this.sourceCode = sourceCode;
            this.nodeType = isJsx ? NODE_TYPE.UI_COMPONENT : NODE_TYPE.FUNCTION;
            const linkComponents = externalComponents.filter(item => {
                const importSpecifier = fileContent.imports.find(im => im.specifiers.find(sp => sp.name === item.name))
                return (importSpecifier || variables.includes(item.name ?? "") || functions.includes(item.name ?? "")) && !importSpecifier?.source.includes("node_modules")
            }).map(item => {
                const importSpecifier = fileContent.imports.find(im => im.specifiers.find(sp => sp.name === item.name))
                if (importSpecifier) {
                    const specifier = importSpecifier.specifiers.find(sp => sp.name === item.name)
                    const importNode = new Node(true, specifier?.type)
                    importNode.name = specifier?.name ?? ""
                    importNode.source = importSpecifier.source,
                        importNode.generateLinks(astController)
                    return importNode
                } else {
                    const node = new Node(false)
                    node.name = item.name ?? ""
                    node.source = this.source
                    node.generateLinks(astController)
                    return node
                }
            })

            const linkFunctions = externalFunctions.filter(item => {
                const importSpecifier = fileContent.imports.find(im => im.specifiers.find(sp => sp.name === item.name))
                return (importSpecifier || variables.includes(item.name ?? "") || functions.includes(item.name ?? "")) && !importSpecifier?.source.includes("node_modules")
            }).map(item => {
                const importSpecifier = fileContent.imports.find(im => im.specifiers.find(sp => sp.name === item.name))
                if (importSpecifier) {
                    const specifier = importSpecifier.specifiers.find(sp => sp.name === item.name)
                    const importNode = new Node(true, specifier?.type)
                    importNode.name = specifier?.name ?? ""
                    importNode.source = importSpecifier.source
                    importNode.generateLinks(astController)
                    return importNode
                } else {
                    const node = new Node(false)
                    node.name = item.name ?? ""
                    node.source = this.source
                    node.generateLinks(astController)
                    return node
                }
            })

            const linkCss = imports.filter(
                (importFile: any) => {
                    return (
                        importFile.source.endsWith(".css") ||
                        importFile.source.endsWith(".less") ||
                        importFile.source.endsWith(".scss"))
                }
            ).map((importFile: any) => {
                const importNode = new Node(true)
                importNode.source = importFile.source;
                importNode.nodeType = NODE_TYPE.CSS
                return importNode;
            })

            this.children = [...linkComponents, ...linkFunctions, ...linkCss]
        }

    }
}

export {
    Node
}