import express from 'express';
import { v4 as uuidV4 } from "uuid"
import { getRouteParseReslut, startParseRoute } from "./tool"
import path from 'path';
import TaskController, { TaskType } from "./task"
import { getFilePath } from './utils/readFile';


const app = express();

const PORT = 3000;

app.use(express.json());

/**
 * git
 * targetBranch
 * callbackUrl
 */
app.post('/diff', (req, res) => {
    const { git, targetBranch, callbackUrl, gitId, benchmarkBranch } = req.body;
    if (git && targetBranch && callbackUrl) {
        const task = TaskController.createTask(
            git,
            gitId,
            callbackUrl,
            targetBranch,
            benchmarkBranch,
            TaskType.DIFF
        )
        TaskController.run()
        res.json({
            error: null,
            errno: 0,
            errmessage: "",
            data: {
                taskId: task.taskId
            }
        });
    } else {
        res.json({
            error: null,
            errno: -100,
            errmessage: "缺少必填参数",
            data: null
        });
    }
});

app.post('/getProjectAnalyze', (req, res) => {
    const { git, targetBranch, callbackUrl, gitId } = req.body;
    if (git && targetBranch && callbackUrl) {
        const task = TaskController.createTask(
            git,
            gitId,
            callbackUrl,
            targetBranch,
            "",
            TaskType.PROJECT
        )
        TaskController.run()
        res.json({
            error: null,
            errno: 0,
            errmessage: "",
            data: {
                taskId: task.taskId
            }
        });
    } else {
        res.json({
            error: null,
            errno: -100,
            errmessage: "缺少必填参数",
            data: null
        });
    }
});

app.listen(PORT, () => {
    console.log(`服务器正在运行在 http://localhost:${PORT}`);
});

// getRouteParseReslut("")
// startParseRoute(getFilePath("/Users/liushuai/Desktop/work/auto-test/connor/packages/app/src/modules/project_manage/pages/Detail"))