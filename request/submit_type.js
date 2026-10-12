/*
 * hexo-leetcode-calendar-for-butterfly — SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 Edward Wang
 * 修改自 PPLong222/hexo-leetcode-calendar（MIT, © 2022 PPLong），声明与改动见 README。
 */
const superagent = require('superagent');

// leetcode-cn.com 已迁移到 leetcode.cn，旧域名会 301；
// 而 superagent 遇到 301/302 会把 POST 降级成无 body 的 GET，导致 400。
const GRAPHQL_URL = 'https://leetcode.cn/graphql/';

// superagent 默认不超时，网络一挂起 hexo g 就会无限等下去。
// response = 等待响应开始，deadline = 整个请求的总时限
const TIMEOUT = { response: 10000, deadline: 30000 };

// 力扣把该查询升级成了 V2 字段，V1 目前仍然可用。
// 优先用 V2，只有当服务端明确报「字段不存在」时才退回 V1。
const PROGRESS_FIELD_V2 = 'userProfileUserQuestionProgressV2';
const PROGRESS_FIELD_V1 = 'userProfileUserQuestionProgress';

const PROGRESS_FIELDS = `
    numAcceptedQuestions {
      difficulty
      count
    }
    numFailedQuestions {
      difficulty
      count
    }
    numUntouchedQuestions {
      difficulty
      count
    }`;

// GraphQL 允许「HTTP 200 + errors」的回包，错误内容在 body.errors 里
function extractErrors(body) {
    let errors = body && body.errors
    return Array.isArray(errors) ? errors : []
}

function describeErrors(errors) {
    return errors
        .map((e) => (e && typeof e.message === 'string') ? e.message : String(e))
        .join('; ')
}

// V2 优先；服务端只认 V1 时，回包里装的就是 V1 那个字段
function extractProgress(body) {
    let data = body && body.data
    return data && (data[PROGRESS_FIELD_V2] || data[PROGRESS_FIELD_V1])
}

// 用户不存在时这个数组是空的；真实账号即使一题没做也会返回三个难度节点
function hasQuestions(progress) {
    return progress != null && Array.isArray(progress.numAcceptedQuestions) &&
        progress.numAcceptedQuestions.length > 0
}

class TypeCountRequest {

    url = GRAPHQL_URL
    request(userName) {
        return this.query(PROGRESS_FIELD_V2, userName).catch((err) => {
            // 只有字段被服务端移除时才退回旧字段，用户不存在之类的错误直接抛出去
            if (!err.schemaChanged) {
                throw err
            }
            return this.query(PROGRESS_FIELD_V1, userName)
        })
    }

    query(field, userName) {
        return superagent
            .post(this.url)
            .set('Content-Type', 'application/json')
            .send(JSON.stringify(this.reloadData(field, userName)))
            .timeout(TIMEOUT)
            .then((res) => this.parseBody(res.body, field, userName))
            .catch((err) => {
                // 力扣把 GraphQL 校验错误包成了 HTTP 400，错误内容在 err.response.body 里。
                // 没有 response 说明是我们自己抛的错（含 schemaChanged）；有 response 但
                // 不是 GraphQL 错误格式时，superagent 自己的报错比任何猜测都有用，直接放行
                let body = err.response && err.response.body
                if (!body || !Array.isArray(body.errors)) {
                    throw err
                }
                return this.parseBody(body, field, userName)
            })
    }

    // 统一处理回包，顺序要紧：先判断是不是「字段没了」（要退回 V1），
    // 再看拿没拿到数据，最后才决定报什么错
    parseBody(body, field, userName) {
        let errors = extractErrors(body)
        this.throwIfFieldChanged(errors, field)

        let progress = extractProgress(body)
        if (hasQuestions(progress)) {
            return this.handleData(progress, userName)
        }
        // 没拿到数据时不能一律说「用户不存在」——限流、校验失败也都长这样，
        // 把服务端原话带出去，否则排查方向会被整个带偏
        if (errors.length > 0) {
            throw new Error(`服务端返回 GraphQL 错误：${describeErrors(errors)}`)
        }
        throw new Error(`用户「${userName}」不存在`)
    }

    // 错误信息里点名了当前字段，说明服务端把它改名/移除了，交给上层退回旧字段
    throwIfFieldChanged(errors, field) {
        if (!Array.isArray(errors)) {
            return
        }
        let hit = errors.find((e) => e && typeof e.message === 'string' && e.message.includes(field))
        if (hit) {
            let err = new Error(`字段 ${field} 已不可用：${hit.message}`)
            err.schemaChanged = true
            throw err
        }
    }

    reloadData(field, userName) {
        let convertData = {
            "operationName": "userQuestionProgress",
            "variables": { "userSlug": userName },
            "query": `query userQuestionProgress($userSlug: String!) {\n  ${field}(userSlug: $userSlug) {${PROGRESS_FIELDS}\n  }\n}\n`
        };
        return convertData
    }

    // 回包校验已经在 parseBody 做过，这里只管把数据整成模板要的形状
    handleData(progress, userName) {
        // 按 difficulty 取值，不再依赖服务端返回的数组顺序
        let countOf = (list, difficulty) => {
            let item = (list || []).find((it) => it && it.difficulty === difficulty)
            return item ? item.count : 0
        }
        // 总题数 = 已通过 + 尝试失败 + 未做（对应页面上的 "x / y"）
        let totalOf = (difficulty) =>
            countOf(progress.numAcceptedQuestions, difficulty) +
            countOf(progress.numFailedQuestions, difficulty) +
            countOf(progress.numUntouchedQuestions, difficulty)

        let finSimple = countOf(progress.numAcceptedQuestions, 'EASY')
        let finMedium = countOf(progress.numAcceptedQuestions, 'MEDIUM')
        let finHard = countOf(progress.numAcceptedQuestions, 'HARD')

        let userUrl = "https://leetcode.cn/u/" + userName
        let info = {
            userName,
            finSimple,
            finMedium,
            finHard,
            allSimple: totalOf('EASY'),
            allMedium: totalOf('MEDIUM'),
            allHard: totalOf('HARD'),
            userUrl,
            subDate: ""
        }
        return info
    }



}
module.exports.TypeCountRequest = TypeCountRequest
