import astController from "./ast"
import parseFile from "./ast"
import parseReactComponent from "./parse"

class Node {
    /**
     * 文件绝对路径
     */
    source: string = ""
    /**
     * 函数/组件名
     */
    name: string = ""
    /**
     * 引用的外部组件
     */
    isImport: boolean = false
    importType: string = ""

    linkComponents: Array<Node> = []
    /**
     * 
     * 引用的外部函数
     */
    linkFunctions: Array<Node> = []

    constructor(isImport: boolean = false, type?: string) {
        this.isImport = isImport
        this.importType = type ?? ""
    }

    generateLinks() {
        if (!this.name || !this.source || this.source.includes("node_modules")) {
            return
        }
        let fileContent = astController.parseFile(this.source)
        const { imports, exportDefault } = fileContent
        /**
         * 处理只是把组件import在直接export的情况
         */
        if (imports.some(item => item.specifiers.find(sp => sp.name === this.name))) {
            const importSpecifier = imports.find(im => im.specifiers.find(sp => sp.name === this.name))
            this.source = importSpecifier?.source ?? ""
            this.importType = importSpecifier?.specifiers?.[0].type ?? this.importType
            this.generateLinks()
        } else if (this.isImport && this.importType === "ImportDefaultSpecifier" && exportDefault?.[0] !== this.name) {
            /**
             * export default 
             * import的时候命名可能不太一样
             */
            if (exportDefault?.[0]) {
                this.name = exportDefault[0]
                this.generateLinks()
            }
        } else {
            const {
                externalComponents,
                externalFunctions
            } = parseReactComponent(this.source, this.name) ?? {}
            this.linkComponents = externalComponents.filter(item => {
                const importSpecifier = fileContent.imports.find(im => im.specifiers.find(sp => sp.name === item.name))
                return !importSpecifier?.source.includes("node_modules")
            }).map(item => {
                const importSpecifier = fileContent.imports.find(im => im.specifiers.find(sp => sp.name === item.name))
                if (importSpecifier) {
                    const specifier = importSpecifier.specifiers.find(sp => sp.name === item.name)
                    const importNode = new Node(true , specifier?.type)
                    importNode.name = specifier?.name ?? ""
                    importNode.source = importSpecifier.source
                    importNode.generateLinks()
                    return importNode
                } else {
                    const node = new Node(false)
                    node.name = item.name ?? ""
                    node.source = this.source
                    node.generateLinks()
                    return node
                }
            })

            this.linkFunctions = externalFunctions.filter(item => {
                const importSpecifier = fileContent.imports.find(im => im.specifiers.find(sp => sp.name === item.name))
                return !importSpecifier?.source.includes("node_modules")
            }).map(item => {
                const importSpecifier = fileContent.imports.find(im => im.specifiers.find(sp => sp.name === item.name))
                if (importSpecifier) {
                    const specifier = importSpecifier.specifiers.find(sp => sp.name === item.name)
                    const importNode = new Node(true, specifier?.type)
                    importNode.name = specifier?.name ?? ""
                    importNode.source = importSpecifier.source
                    importNode.generateLinks()
                    return importNode
                } else {
                    const node = new Node(false)
                    node.name = item.name ?? ""
                    node.source = this.source
                    node.generateLinks()
                    return node
                }
            })
        }
        


    }
}

export {
    Node
}