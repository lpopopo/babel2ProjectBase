module.exports = {
    baseUrl: "./packages/app",
    routers: [
        {
            path: '/project_config',
            componentFile: "./packages/app/src/modules/project_config"
        },
        {
            path: '/project',
            componentFile: "./packages/app/src/modules/project_manage",
        },
        {
            path: '/project_sign',
            componentFile: "./packages/app/src/modules/project_manage_v2",
        },
        {
            path: '/project_furnish',
            componentFile: "./packages/app/src/modules/project_furnish",
        },
        {
            path: '/project_off_todo',
            componentFile: "./packages/app/src/modules/project_off_todo",
        },
        {
            path: '/status',
            componentFile: "./packages/app/src/modules/status",
        },
        {
            path: '/configs',
            componentFile: "./packages/app/src/modules/configs",
        },
        {
            path: '/configs/resblock/list',
            componentFile: "./packages/app/src/modules/configs/pages/list"
        },
        {
            path: '/configs/resblock/modules',
            componentFile: "./packages/app/src/modules/configs/pages/modules"
        },
        {
            path: '/project/list',
            componentFile: "./packages/app/src/modules/project_manage/pages/List"
        },
        {
            path: '/project/create',
            componentFile: "./packages/app/src/modules/project_manage/pages/Edit"
        },
        {
            path: '/project/detail',
            componentFile: "./packages/app/src/modules/project_manage/pages/Detail"
        }
    ]
}
