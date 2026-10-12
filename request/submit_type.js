const superagent = require('superagent');

// leetcode-cn.com 已迁移到 leetcode.cn，旧域名会 301；
// 而 superagent 遇到 301/302 会把 POST 降级成无 body 的 GET，导致 400。
const GRAPHQL_URL = 'https://leetcode.cn/graphql/';

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
            .then((res) => {
                // 少数情况下校验错误也会以 200 + errors 返回
                this.throwIfFieldChanged(res.body && res.body.errors, field)
                return this.handleData(res.body, userName)
            })
            .catch((err) => {
                // 力扣把 GraphQL 校验错误包成了 HTTP 400，错误内容在 err.response.body 里
                const errors = err.response && err.response.body && err.response.body.errors
                this.throwIfFieldChanged(errors, field)
                throw err
            })
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

    handleData(data, userName) {
        let progress = data && data.data &&
            (data.data[PROGRESS_FIELD_V2] || data.data[PROGRESS_FIELD_V1])
        // 用户不存在时服务端返回的是空数组，而真实账号即使一题没做也会返回三个难度节点
        if (progress == null || !Array.isArray(progress.numAcceptedQuestions) ||
            progress.numAcceptedQuestions.length === 0) {
            throw new Error(`用户「${userName}」不存在`)
        }

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
