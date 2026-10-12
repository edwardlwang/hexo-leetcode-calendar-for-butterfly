/*
 * hexo-leetcode-calendar-for-butterfly — SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 Edward Wang
 * 修改自 PPLong222/hexo-leetcode-calendar（MIT, © 2022 PPLong），声明与改动见 README。
 */
const superagent = require('superagent');

// leetcode-cn.com 已迁移到 leetcode.cn，旧域名会 301
const CALENDAR_URL = 'https://leetcode.cn/api/user_submission_calendar/';

// superagent 默认不超时，网络一挂起 hexo g 就会无限等下去。
// response = 等待响应开始，deadline = 整个请求的总时限
const TIMEOUT = { response: 10000, deadline: 30000 };

class StampCountRequest {

    url = CALENDAR_URL
    request(userName) {
        return superagent
            .get(this.url + encodeURIComponent(userName) + '/')
            .timeout(TIMEOUT)
            .then((res) => this.handleData(res.body))
    }

    handleData(data) {
        // superagent 在 content-type 是 json 时已经把 body 解析过了，
        // 只有解析不了的时候才会拿到字符串，这里两种都兼容；
        // 服务端对未公开提交记录的用户会返回 {} 或 "{}"
        let parsed = data
        if (typeof parsed === 'string') {
            try {
                parsed = JSON.parse(parsed)
            } catch (err) {
                parsed = {}
            }
        }
        if (parsed == null || typeof parsed !== 'object') {
            return {}
        }
        return parsed
    }



}
module.exports.StampCountRequest = StampCountRequest
