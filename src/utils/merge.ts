import { ParsedResultMore } from "../typings";
import { Node } from "./node"

export function nestData(data: ParsedResultMore[]) {
    // 递归函数，用于将子对象嵌套到父对象中
    function nest(parent: ParsedResultMore, children: ParsedResultMore[]) {
        parent.rangs = [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if ((child?.start ?? 0) >= (parent?.start ?? 0) && (child?.end ?? 0) <= (parent?.end ?? 0)) {
                parent.rangs.push(child);
                // 递归嵌套子对象
                nest(child, children.slice(i + 1));
            }
        }
    }

    const result = [];
    for (let i = 0; i < data.length; i++) {
        const current = data[i];
        let isNested = false;
        for (let j = 0; j < result.length; j++) {
            const parent = result[j];
            if ((current?.start ?? 0) >= (parent?.start ?? 0) && (current?.end ?? 0) <= (parent?.end ?? 0)) {
                nest(parent, data.slice(i));
                isNested = true;
                break;
            }
        }
        if (!isNested) {
            result.push(current);
        }
    }
    return result;
}

export function mergeIntervals(intervals: ParsedResultMore[]) {
    if (!intervals || intervals.length === 0) {
        return [];
    }
    // 首先对数组进行排序，以确保所有区间按开始时间排序
    intervals.sort((a, b) => (a?.start ?? 0) - (b?.start ?? 0));
    const merged = [];
    let currentInterval = intervals[0];

    for (let i = 1; i < intervals.length; i++) {
        const nextInterval = intervals[i];

        // 检查当前区间的结束是否可以与下一个区间的开始连接
        if (currentInterval.end && nextInterval.start && currentInterval.end >= nextInterval.start - 1) {
            // 合并区间
            currentInterval.end = Math.max(currentInterval.end, nextInterval?.end ?? 0);
            currentInterval.source = currentInterval.source + nextInterval.source
        } else {
            // 如果不能合并，保存当前区间，并开始新的区间
            merged.push(currentInterval);
            currentInterval = nextInterval;
        }
    }

    // 将最后一个区间加入结果
    merged.push(currentInterval);

    return merged;
}


type SimpleNode = Omit<Node, "children" | "generateLinks">


export const flattenNode = (node: Node, parent: Node | null = null): Array<{ pre: SimpleNode | null; content: SimpleNode }> => {
    let result: Array<{ pre: SimpleNode | null; content: SimpleNode }> = [];

    // 将当前节点自身加入结果，pre 为 parent
    result.push({
        pre: parent ? copyNode(parent) : null,
        content: copyNode(node)
    });

    const { children } = node;
    children.forEach(child => {
        // 递归处理子节点，并将结果合并到当前结果中
        result = result.concat(flattenNode(child, node));
    });

    return result;
};


const copyNode = (node: Node): SimpleNode => {
    const copy = {
        source: node.source,
        sourceCode: node.sourceCode,
        name: node.name,
        nodeType: node.nodeType,
        isImport: node.isImport,
        importType: node.importType,
    }
    return copy
}