
import { Node } from './utils/node';
import AstController from "./utils/ast";
import fs from 'fs';
import path from 'path';
import Axios from 'axios';
import simpleGit from "simple-git"
import { diffLines } from "diff"
import { flattenNode, nestData } from './utils/merge';
import { getFilePath } from './utils/readFile';
import { basePath, localPath } from './utils/const';


const git = simpleGit();

export const startParseRoute = async (filePath: string) => {
    const config = fs.existsSync(path.resolve(localPath, "./autoRouter.config.js")) ?
        require(path.resolve(localPath, "./autoRouter.config.js")) :
        require(path.resolve(basePath, "./autoRouter.config.js"))
    const astController = new AstController(config.baseUrl)
    const routeFile = astController.parseFile(filePath)
    const exportDefault = routeFile.exportDefault?.[0]
    const routeNode = new Node()
    routeNode.name = exportDefault ?? ""
    routeNode.source = filePath
    routeNode.generateLinks(astController)
    return routeNode
}


export const getRouteParseReslut = async (
    gitPath: string,
) => {
    fs.rmSync(localPath, { recursive: true, force: true });
    await git.addConfig('http.extraHeader', `PRIVATE-TOKEN: CKHeZpdidCsMYeL_nWXX`);
    await git.clone(gitPath, localPath);
    git.cwd(localPath)
    //读取路由文件配置

    const config = fs.existsSync(path.resolve(localPath, "./autoRouter.config.js")) ?
        require(path.resolve(localPath, "./autoRouter.config.js")) :
        require(path.resolve(basePath, "./autoRouter.config.js"))
    const { routers } = config ?? {}
    const routesParseResFlatten = {} as any
    const routesParseRes = {} as any
    if (Array.isArray(routers) &&
        routers.length &&
        routers.every((r) => r.path && r.componentFile)
    ) {
        for (let routerConfig of routers) {
            const { path: routerPath, componentFile } = routerConfig
            const filePath = path.resolve(localPath, componentFile)
            const routerParseReslut = await startParseRoute(getFilePath(filePath))
            const routerParseReslutList = flattenNode(routerParseReslut)
            routesParseResFlatten[routerPath] = routerParseReslutList
            routesParseRes[routerPath] = routerParseReslut 
        }
    } 
    fs.writeFileSync(path.resolve(basePath, "./parse.json"), JSON.stringify(routesParseRes))
    return routesParseResFlatten
}


export const getDiff2Master = async (
    gitId: string,
    gitPath: string,
    diffBranch: string,
    benchmarkBranch = "master"
) => {
    fs.rmSync(localPath, { recursive: true, force: true });
    await git.addConfig('http.extraHeader', `PRIVATE-TOKEN: CKHeZpdidCsMYeL_nWXX`);
    await git.clone(gitPath, localPath);
    const config = fs.existsSync(path.resolve(localPath, "./autoRouter.config.js")) ?
        require(path.resolve(localPath, "./autoRouter.config.js")) :
        require(path.resolve(basePath, "./autoRouter.config.js"))
    git.cwd(localPath)
    const respone = await Axios.get(`https://git.lianjia.com/api/v4/projects/${gitId}/repository/compare?from=${benchmarkBranch}&to=${diffBranch}`,
        {
            headers: {
                "PRIVATE-TOKEN": "CKHeZpdidCsMYeL_nWXX",
            },
        })
    const { diffs } = respone.data
    const diffReslut = []
    for (let diffFile of diffs) {
        const { new_path, old_path } = diffFile;
        const fileDiffReslut = await diff2BranchFile(diffBranch, old_path, new_path, config.baseUrl)
        diffReslut.push({
            new_path,
            old_path,
            changes: fileDiffReslut
        })
    }
    fs.rmSync(localPath, { recursive: true, force: true });
    return diffReslut
}

const diff2BranchFile = async (branch: string, old_path: string, new_path: string, baseUrl: string) => {
    const masterFile = await git.show(`master:${old_path}`);
    const astController = new AstController(baseUrl)
    const parseMasterFile = astController.parseFileMore(path.resolve(__dirname, localPath, old_path))
    const parseMasterFileRangs = nestData(parseMasterFile)
    await git.checkout(branch)
    const parseBranchFile = astController.parseFileMore(path.resolve(__dirname, localPath, new_path))
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
    const changeAddList = diff4Lines.filter((change) => change.added);
    const changeRemoveList = diff4Lines.filter((change) => change.removed);
    const changeAddRangList = changeAddList.map((change) => {
        return parseBranchFileRangs.find((item) => {
            return (item.start ?? 0) <= change.start && (item.end ?? 0) >= change.end
        })
    }).filter(Boolean)
    const changeRemoveRangList = changeRemoveList.map((change) => {
        return parseMasterFileRangs.find((item) => {
            return (item.start ?? 0) <= change.start && (item.end ?? 0) >= change.end
        })
    }).filter(Boolean)
    return Array.from(new Set([...changeRemoveRangList, ...changeAddRangList]))
}


