const superagent = require('superagent');

// leetcode-cn.com 已迁移到 leetcode.cn，旧域名会 301
const CALENDAR_URL = 'https://leetcode.cn/api/user_submission_calendar/';

class StampCountRequest {

    url = CALENDAR_URL
    request(userName) {
        return superagent
            .get(this.url + encodeURIComponent(userName) + '/')
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
