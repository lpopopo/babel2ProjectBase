
import parseFile, { routePath } from './utils/ast';
import { Node } from './utils/node';
import astController from "./utils/ast";
import fs from 'fs';
import path from 'path';


const startParseRoute = (filePath: string) => {
    const routeFile = astController.parseFile(filePath)
    const exportDefault = routeFile.exportDefault?.[0]
    const routeNode = new Node()
    routeNode.name = exportDefault ?? ""
    routeNode.source = filePath
    routeNode.generateLinks()
    const data = JSON.stringify(routeNode);
    const mapArray = Array.from(astController.fileMap.entries());
    const fileMap = JSON.stringify(mapArray)
    fs.writeFile(path.resolve(__dirname, "../parseReslut/output.json"), data, (err) => {
        if (err) {
            console.error('写入文件时发生错误:', err);
        } else {
            console.log('数据已成功写入到文件中');
        }
    });
    fs.writeFile(path.resolve(__dirname, "../parseReslut/file.json"), fileMap, (err) => {
        if (err) {
            console.error('写入文件时发生错误:', err);
        } else {
            console.log('数据已成功写入到文件中');
        }
    });
}





startParseRoute(routePath)
// startParseRoute("/Users/liushuai/Desktop/work/connor/packages/app/src/modules/project_manage_v2/components/ShelfStatusEditModal/index.tsx");
