
import parseFile, { routePath } from './utils/ast';
import { Node } from './utils/node';
import astController from "./utils/ast";
import fs from 'fs';
import path from 'path';
import Axios from 'axios';
import simpleGit from "simple-git"
import Diff, { parsePatch, applyPatch  , diffLines} from "diff"
import { nestData } from './utils/merge';

const localPath = path.resolve(__dirname, "../connor");
const git = simpleGit();

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





// startParseRoute(routePath)
// startParseRoute("/Users/liushuai/Desktop/work/connor/packages/app/src/modules/project_manage_v2/components/ShelfStatusEditModal/index.tsx");

const getDiff2Master = async (
    gitPath: string
) => {
    await git.addConfig('http.extraHeader', `PRIVATE-TOKEN: CKHeZpdidCsMYeL_nWXX`);
    await git.clone(gitPath, localPath);
    const respone = await Axios.get("https://git.lianjia.com/api/v4/projects/15650/repository/compare?from=master&to=feat/50365660/decoration_protocol_migrate", {
      headers: {
            "PRIVATE-TOKEN": "CKHeZpdidCsMYeL_nWXX",
      },
    })
    const { diffs } = respone.data
    for (let diffFile of diffs) {
        const { new_path, old_path } = diffFile;
        const fileDiffReslut = await diff2BranchFile("feat/50365660/decoration_protocol_migrate", old_path, new_path)
        console.log(fileDiffReslut)
    }
}

const diff2BranchFile = async (branch: string, old_path: string, new_path: string) => {
    console.log("old_path=============>", old_path)
    const masterFile = await git.show(`master:${old_path}`);
    const parseMasterFile = astController.parseFileMore(path.resolve(__dirname, "../git", old_path))
    const parseMasterFileRangs = nestData(parseMasterFile)
    await git.checkout(branch)
    const parseBranchFile = astController.parseFileMore(path.resolve(__dirname, "../git", new_path))
    const parseBranchFileRangs = nestData(parseBranchFile)
    const branchFile = await git.show(`${branch}:${new_path}`);
    const diff = diffLines(masterFile, branchFile);
    let start = 1;
    let l = 0;
    const diff4Lines = diff.map(c => {
        start = start + l;
        const { value } = c
        const lines = value.split("\n").length
        l = lines
        const end = start + lines - 1
        return {
            start,
            end,
            ...c
        }
    })
    const changes = diff4Lines.filter((change) => change.added || change.removed);
    const changesRangs = Array.from(new Set(
        changes.map((change) => {
            if (change.added) {
                return parseBranchFileRangs.find((item) => {
                    return (item.start ?? 0) <= change.start && (item.end ?? 0) >= change.end
                })
            } else {
                return parseMasterFileRangs.find((item) => {
                    return (item.start ?? 0) <= change.start && (item.end ?? 0) >= change.end
                })
            }
        })
    ))
    return changesRangs
}

getDiff2Master("git@git.lianjia.com:xffe/connor.git")