const { TypeCountRequest, StampCountRequest } = require("./request")
const path = require("path");
const fs = require("hexo-fs");
const renderer = require('./render');

const MAIN_PANEL_TEMPLATE = path.resolve(__dirname, "./templates/main_panel.html");
const style = fs.readFileSync(path.resolve(__dirname, "./templates/assets/style.css"), { encoding: "utf8" });
const script = fs.readFileSync(path.resolve(__dirname, "./templates/assets/loadPanel.js"), { encoding: "utf8" });
const { config } = hexo;
const { leetcodecalendar } = config;
// 站点配置默认变量（浅色模式）
var subColors = ['#ebedf0', '#bef5cb', '#85e89d', '#34d058', '#1c992f'];
var submitGap = 5
var bgColor = '#fff'
var submitColor = '#000'
var isIconShowed = "block"

// 深色模式默认变量：博客切到深色时自动换用的另一套配色，
// 默认值参考 GitHub 深色主题的热力图，可在站点配置里用 dark* 系列字段覆盖
var darkSubColors = ['#21262d', '#0e4429', '#006d32', '#26a641', '#39d353'];
var darkBgColor = '#161b22'
var darkSubmitColor = '#c9d1d9'

var typeCountRequest = new TypeCountRequest();
var stampCountRequest = new StampCountRequest();

var beforeGenParama = {}

// 加载自定义配置
function loadConfig() {
    if (leetcodecalendar != null) {
        if (leetcodecalendar.color != null) {
            bgColor = leetcodecalendar.color.bgColor ? leetcodecalendar.color.bgColor : bgColor
            subColors = leetcodecalendar.color.subColors ? leetcodecalendar.color.subColors : subColors
            submitColor = leetcodecalendar.color.submitColor ? leetcodecalendar.color.submitColor : submitColor
            // 深色模式配色，不配就用上面的默认值
            darkBgColor = leetcodecalendar.color.darkBgColor ? leetcodecalendar.color.darkBgColor : darkBgColor
            darkSubColors = leetcodecalendar.color.darkSubColors ? leetcodecalendar.color.darkSubColors : darkSubColors
            darkSubmitColor = leetcodecalendar.color.darkSubmitColor ? leetcodecalendar.color.darkSubmitColor : darkSubmitColor
        }
        if (leetcodecalendar.showIcon != null) {
            if (leetcodecalendar.showIcon)
                isIconShowed = 'block'
            else
                isIconShowed = 'none'
        }
        submitGap = leetcodecalendar.submitGap ? leetcodecalendar.submitGap : submitGap;
    }
    beforeGenParama = {
        bgColor, subColors, submitColor, isIconShowed, submitGap,
        darkBgColor, darkSubColors, darkSubmitColor
    }
}

// 单个标签出错时只跳过这一个日历，不要让整个 hexo g 崩掉
// （请求失败如果没有被捕获，Node 15+ 会当作 unhandled rejection 直接结束进程）
function skipTag(reason) {
    console.warn(`[hexo-leetcode-calendar-for-butterfly] ${reason}，该日历标签已跳过`)
    return Promise.resolve("")
}

hexo.extend.tag.register(
    "leetcode",
    (args) => {
        loadConfig()
        const userName = args[0]
        if (!userName) {
            return skipTag("标签缺少用户名，用法：{% leetcode <username> %}")
        }
        if (leetcodecalendar != null && !leetcodecalendar.enable) {
            // 直接跳过
            return Promise.resolve("")
        }
        return Promise.all([
            typeCountRequest.request(userName),
            stampCountRequest.request(userName),
        ]).then(([userInfo, stampCount]) => {
            if (Object.keys(stampCount).length === 0) {
                console.warn(`[hexo-leetcode-calendar-for-butterfly] 「${userName}」最近一年的提交日历为空，` +
                    `通常是该用户没有公开提交记录（在力扣个人设置里公开后重新 hexo g 即可）`)
            }
            return new Promise((resolve, reject) => {
                renderer.render(MAIN_PANEL_TEMPLATE, {
                    style,
                    script,
                    stampCount: JSON.stringify(stampCount),
                    ...beforeGenParama,
                    ...userInfo
                }, (err, res) => {
                    if (err) {
                        return reject(err)
                    }
                    resolve(res)
                })
            })
        }).catch((err) => skipTag(`获取「${userName}」的数据失败：${err.message}`))
    }, {
        async: true,
    })