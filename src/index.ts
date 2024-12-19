import express from 'express';
import { v4 as uuidV4 } from "uuid"
import { getRouteParseReslut, startParseRoute } from "./tool"
import path from 'path';


// const app = express();

// const PORT = 3000;

// app.use(express.json());

// /**
//  * git
//  * branch
//  * callbackUrl
//  */
// app.post('/diff', (req, res) => {
//     const { git, branch, callbackUrl } = req.body;
//     const taskId = Date.now(); // 简单的任务ID生成方式
//     res.json({ 
//         error: null,
//         errno: 0,
//         errmessage: "",
//         data: {
//             taskId
//         }
//      });
// });

// app.listen(PORT, () => {
//     console.log(`服务器正在运行在 http://localhost:${PORT}`);
// });

getRouteParseReslut("")
// startParseRoute("/Users/liushuai/Desktop/work/auto-test/connor/packages/app/src/modules/configs/pages/modules")