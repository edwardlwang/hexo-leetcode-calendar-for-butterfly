/*
 * hexo-leetcode-calendar-for-butterfly — SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 Edward Wang
 * 修改自 PPLong222/hexo-leetcode-calendar（MIT, © 2022 PPLong），声明与改动见 README。
 */
const fs = require("hexo-fs");
module.exports = {
    /**
     *
     * @param {string} templatePath 模板
     * @param {Object} data 数据
     * @param {Function} callback 回调函数
     */
    render(templatePath, data, callback) {
        try {
            let template = fs.readFileSync(templatePath, { encoding: "utf8" });
            Object.keys(data).forEach((key) => {
                // 用函数形式替换，否则值里的 $& / $1 会被当成替换模式；
                // String(...) 顺带把 subColors 这类数组转成逗号串
                template = template.replace(new RegExp(`{{${key}}}`, "g"), () => String(data[key]));

            });
            callback(null, template);
        } catch (error) {
            console.log("rendererror" + error);
            callback(error, null);
        }
    },
};
