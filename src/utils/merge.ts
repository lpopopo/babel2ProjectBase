import { ParsedResultMore } from "../typings";

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