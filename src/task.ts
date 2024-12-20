import { getDiff2Master, getRouteParseReslut } from "./tool";
import { v4 as uuidV4 } from "uuid"
import fs from "fs"
import path from "path";
import { basePath } from "./utils/const";

interface Task{
    taskId: string;
    type: TaskType;
    git: string;
    projectId: string;
    targetBranch?: string;
    benchmarkBranch?: string;
    callbackUrl: string;
}

export enum TaskType{
    DIFF = "diff",  
    PROJECT = "project"
}

class TaskController {
    queue: Array<Task> = [];
    currentTask?: Task | undefined;
    timer?: NodeJS.Timeout;

    addTask(task: Task) {
        this.queue.push(task);
    }

    createTask(git: string, projectId: string, callbackUrl:string ,targetBranch: string, benchmarkBranch?: string, type?: TaskType) {
        const taskId = uuidV4()
        const task = {
            git,
            projectId,
            targetBranch,
            benchmarkBranch: benchmarkBranch ?? "master",
            type: type ?? TaskType.PROJECT,
            taskId,
            callbackUrl
        }
        this.addTask(task)
        return task
    }

    async run() {
        if (this.currentTask) {
            return
        }
        console.log("task run=============>")
        if (this.queue.length > 0) {
            const task = this.queue.shift();
            this.currentTask = task;
            if(task?.type === TaskType.DIFF) {
                const diffRes = await getDiff2Master(task.projectId, task.git, task.targetBranch!, task.benchmarkBranch)
                console.log("diffReslut=========>", diffRes)
            }else if(task?.type===TaskType.PROJECT) {
                const routeParseRes = await getRouteParseReslut(task.git)
                console.log("diffReslut=========>", routeParseRes) 
                fs.writeFileSync(path.resolve(basePath, "res.json"), JSON.stringify(routeParseRes))
            }
            this.currentTask = undefined;
            this.run()
        } else {
            this.pollTask();
        }
    }

    pollTask = async () => {
        this.timer = setInterval(() => {
            if (this.queue.length > 0) {
                clearInterval(this.timer!);
                this.run();
            }
        }, 1000 * 60)
    }

}

export default new TaskController()