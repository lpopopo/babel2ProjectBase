import { getDiff2Master } from "./tool";

interface Task{
    taskId: string;
    type: TaskType;
    git: string;
    projectId: string;
    targetBranch?: string;
    benchmarkBranch?: string;
}

enum TaskType{
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

    async run() {
        if (this.queue.length > 0) {
            const task = this.queue.shift();
            this.currentTask = task;
            if(task?.type === TaskType.DIFF) {
                await getDiff2Master(task.projectId, task.git, task.targetBranch!, task.benchmarkBranch)
            }else if(task?.type===TaskType.PROJECT) {
                
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