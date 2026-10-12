/* hexo-leetcode-calendar-for-butterfly — SPDX-License-Identifier: GPL-3.0-only
 * Copyright (C) 2026 Edward Wang (modifications)
 * Portions Copyright (c) 2022 PPLong — 源自 PPLong222/hexo-leetcode-calendar（MIT），
 * 声明与改动见 README。 */
(function leetcodeCalendar() {
    var leetCanvas = document.getElementById('leetcode-sub-calendar');
    var leetCtx = leetCanvas.getContext('2d');
    // 配色统一挂在 .leetcode-calendar-wall 上（模板内联 + style.css），
    // canvas 里的格子颜色 CSS 管不到，所以这里也要读同一批变量
    var wall = document.getElementsByClassName('leetcode-calendar-wall')[0];
    // 布局宽度 = canvas 的 CSS 宽度（按 devicePixelRatio 放大之前的值）。
    // 每次重绘都从它重新算，否则切换深浅色重绘时会把 ratio 又乘一遍
    var baseWidth = Number(getComputedStyle(leetCanvas).width.match(/[0-9]+/)[0]);
    var width = baseWidth;
    const dayMillSeconds = 24 * 60 * 60 * 1000;
    const maxRowSize = 7
    const maxColSize = 52
    const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const weeks = ['日', '二', '四', '六']
    const submitGap = document.getElementsByClassName('color-array')[0].getAttribute('submit-gap')
    // 由 themeColors() 在每次绘制时重新填，浅色/深色各一套
    var subColors = []
    const curDate = new Date();
    const curDateConvert = new Date(curDate.getFullYear(), curDate.getMonth(), +curDate.getDate(), 8, 0, 0);
    const curWeekDay = curDate.getDay() == 0 ? 7 : curDate.getDay() + 1
    const initDate = new Date(curDateConvert.getTime() - (maxRowSize * (maxColSize - 1) + curWeekDay - 1) * dayMillSeconds)
    const userName = document.getElementsByClassName('datasource')[0].getElementsByTagName('a')[0].innerHTML.substring(1)
    // 数据挂在 canvas 的 stamp-param 上，读完就会被删掉。
    // 脚本被重复执行时（PJAX 换页、手动插入等）属性已经没了，此时直接退出，
    // 不要抛错——画面上那份日历是第一遍画好的，还在
    const stampParam = document.getElementById('leetcode-sub-calendar').getAttribute("stamp-param")
    if (!stampParam) {
        return
    }
    const objectMap = JSON.parse(stampParam)
    const map = new Map()
    for (key of Object.keys(objectMap)) {
        map.set(key * 1000, objectMap[key])
    }

    // 当前是不是深色：优先看主题打的标记，没标记就跟随系统偏好。
    // <html data-theme="dark"> 是 Butterfly / NexT 等主题的通行写法
    function isDarkMode() {
        var el = document.documentElement
        var attr = el.getAttribute('data-theme')
        if (attr === 'dark') return true
        if (attr === 'light') return false
        if (el.classList.contains('dark') || el.classList.contains('dark-mode') || el.classList.contains('darkmode')) return true
        return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
    }

    function cssVar(name) {
        return getComputedStyle(wall).getPropertyValue(name).trim()
    }

    // 取当前主题该用的配色：主色是模板内联注入的浅/深两套，
    // 辅助色（月份文字等）在 style.css 里已按主题分好，直接读即可
    function themeColors() {
        var dark = isDarkMode()
        return {
            sub: (dark ? cssVar('--lc-sub-dark') : cssVar('--lc-sub-light'))
                .split(',').map(function (s) { return s.trim() }).filter(Boolean),
            muted: cssVar('--lc-muted')
        }
    }

    removeAttribute()

    handle(map)

    // 主题切换后必须重绘：已经画在 canvas 上的像素不会因为 CSS 变量变化而改变
    var lastDark = isDarkMode()
    function onThemeMaybeChanged() {
        var dark = isDarkMode()
        if (dark === lastDark) return
        lastDark = dark
        handle(map)
    }
    // 主题切换的一般表现就是改 <html> 上的属性/类名，盯着这个就够通用了
    new MutationObserver(onThemeMaybeChanged).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class']
    })
    // 主题没打标记、纯跟随系统偏好时，系统换肤走这条
    var darkMedia = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
    if (darkMedia) {
        if (darkMedia.addEventListener) darkMedia.addEventListener('change', onThemeMaybeChanged)
        else if (darkMedia.addListener) darkMedia.addListener(onThemeMaybeChanged)
    }

    function handle(data) {
        // 重置画布：既清掉上一帧，也把宽度还原成未放大的值，保证可以反复重绘
        leetCanvas.width = baseWidth
        leetCanvas.height = 0
        width = baseWidth

        var colors = themeColors()
        subColors = colors.sub
        // 兜底：万一变量没读到（比如被主题的样式覆盖了），退回默认的浅色档位
        if (subColors.length < 2) {
            subColors = ['#ebedf0', '#bef5cb', '#85e89d', '#34d058', '#1c992f']
        }

        leetCtx.fillStyle = subColors[0]

        var divMargin = 3
        var monthFontSize = 10
        var calendarTopMargin = 20
        var calendarBottomMargin = 10
        var calendarLeftMargin = Math.floor(0.05 * width)
        var divSize = (width - 2 * calendarLeftMargin) / maxColSize - divMargin
        var isInSmallClient = false;

        var height = leetCanvas.height = calendarTopMargin + monthFontSize + 7 * (divSize + divMargin) + calendarBottomMargin

        // 更新height高度
        judgeClientWidth()

        var getPixelRatio = function(context) {
            var backingStore = context.backingStorePixelRatio ||
                context.webkitBackingStorePixelRatio ||
                context.mozBackingStorePixelRatio ||
                context.msBackingStorePixelRatio ||
                context.oBackingStorePixelRatio ||
                context.backingStorePixelRatio || 1;
            return (window.devicePixelRatio || 1) / backingStore;
        };
        var ratio = getPixelRatio(leetCtx);
        // deal problems in showing in  high-dpi screen
        if (ratio != 1) {
            leetCanvas.style.width = leetCanvas.width + "px";
            leetCanvas.style.height = leetCanvas.height + "px";
            width = leetCanvas.width = leetCanvas.width * ratio;
            height = leetCanvas.height = leetCanvas.height * ratio;
            monthFontSize *= ratio
            divMargin *= ratio
            calendarTopMargin *= ratio
            calendarBottomMargin *= ratio
            calendarLeftMargin = Math.floor(0.05 * width)
            divSize = (width - 2 * calendarLeftMargin) / maxColSize - divMargin
        }

        // Draw main days block with canvas
        for (col = 0; col < maxColSize; col++) {
            tempRow = maxRowSize;
            if (col == maxColSize - 1) {
                tempRow = curWeekDay;
            }

            for (row = 0; row < tempRow; row++) {
                let curX = calendarLeftMargin + col * (divSize + divMargin)
                let curY = calendarTopMargin + monthFontSize + row * (divSize + divMargin)
                curStamp = initDate.getTime() + (col * 7 + row) * dayMillSeconds
                if (data.get(curStamp) != null) {
                    leetCtx.fillStyle = subColors[Math.min(Math.floor(data.get(curStamp) / submitGap), subColors.length - 1)]
                } else {
                    leetCtx.fillStyle = subColors[0]
                }
                leetCtx.fillRect(curX, curY, divSize, divSize)
            }

        }


        if (!isInSmallClient) {
            drawMonth()
            drawWeekDay()
        }

        setMouseListener()

        fillColorArr()

        calcAnnualSubCount(data)

        changeYearGapText()

        // 根据当前鼠标在页面的绝对坐标和相对canvas的坐标来判断是否在box上
        function judgeAndGenTooltips(x, y, pageX, pageY) {
            if (x < calendarLeftMargin || x > calendarLeftMargin + maxColSize * (divSize + divMargin) - divMargin) {
                return false;
            }
            if (y < calendarTopMargin + monthFontSize || y > calendarTopMargin + monthFontSize +
                7 * (divMargin + divSize) - divMargin) {
                return false;
            }
            toolTipsContainer = document.getElementsByClassName("leetcode-tips-container")[0];
            curCol = Math.floor((x - calendarLeftMargin) / (divMargin + divSize))
            curRow = Math.floor((y - calendarTopMargin - monthFontSize) / (divMargin + divSize))
            selectDate = new Date(initDate.getTime() + (curCol * 7 + curRow) * dayMillSeconds)
            toolTips = document.getElementById("leetcode-tips")
                // 没必要动态加载, 后期直接在页面内预装好模块
            if (toolTips == null) {
                toolTips = document.createElement("p")
                // 颜色和行高都放在 style.css 的 .leetcode-tips 里，好跟着深浅色一起变
                toolTips.className = "leetcode-tips"
                toolTips.id = "leetcode-tips"

                toolTipsContainer.appendChild(toolTips)
            }
            let subCount = 0;
            if (data.get(selectDate.getTime()) != null) {
                subCount = data.get(selectDate.getTime());
            }
            const content = selectDate.getFullYear() + "-" + (selectDate.getMonth() + 1) + "-" + selectDate.getDate() + "  " + subCount + "次提交"
            const containerHeight = window.getComputedStyle(toolTipsContainer).height.match(/[0-9]+/)[0];
            const containerWidth = window.getComputedStyle(toolTipsContainer).width.match(/[0-9]+/)[0];
            toolTips.innerHTML = content
            toolTipsContainer.style.display = "block"
            toolTipsContainer.style.left = pageX - containerWidth / 2 + "px";
            toolTipsContainer.style.top = pageY - containerHeight - 20 + "px"
        }

        function drawWeekDay() {
            // 星期文字的颜色要显式设置，否则会沿用最后一个格子的填色
            leetCtx.fillStyle = colors.muted
            const weekDayVerticalMargin = (divMargin + divSize) * 2
            const weekDayLeftMargin = 0.03 * width
            for (i in weeks) {
                curX = weekDayLeftMargin
                curY = calendarTopMargin + monthFontSize + 10 * ratio + i * weekDayVerticalMargin
                leetCtx.fillText(weeks[i], curX, curY)
            }
        }

        function drawMonth() {
            leetCtx.fillStyle = colors.muted
            const monthsHorizonMargin = Math.floor(0.05 * width)
            const monthMargin = (width - months.length * monthFontSize - 2.5 * monthsHorizonMargin) / (months.length - 1)
            leetCtx.font = monthFontSize + "px Arial"
            startMonth = initDate.getMonth()

            for (i = 0; i < months.length + 1; i++) {
                curX = 1.5 * monthsHorizonMargin + i * (monthMargin + monthFontSize)
                curY = calendarTopMargin
                leetCtx.fillText(months[(i + startMonth + 1) % 12], curX, curY)
            }
        }

        function changeYearGapText() {
            dom = document.getElementsByClassName("leetcode-bottom-text")[1]
            dom.innerHTML = initDate.getFullYear() + "-" + (initDate.getMonth() + 1) + "-" + initDate.getDate() +
                " - " + curDate.getFullYear() + "-" + (curDate.getMonth() + 1) + "-" + curDate.getDate()
        }

        function calcAnnualSubCount(data) {
            sum = 0
            for (let [key, value] of data.entries()) {
                if (parseInt(key) > initDate.getTime()) {
                    sum += value
                }
            }
            dom = document.getElementsByClassName("leetcode-annul-sub-text")[0]
            dom.innerHTML = sum
        }

        function fillColorArr() {
            li_list = document.getElementsByClassName("color-array")[0];
            for (i in li_list.children) {
                li_list.children[i].style = 'background: ' + subColors[i] + ';'
            }
        }

        function setMouseListener() {
            leetCanvas.onmousemove = function(event) {
                judgeAndGenTooltips(event.offsetX, event.offsetY, event.x, event.y)
            }
            leetCanvas.onmouseout = function(event) {
                toolTipsContainer = document.getElementsByClassName("leetcode-tips-container")[0];
                toolTipsContainer.style.display = "none"
            }
        }

        // 客户端窗口过小不显示下方数据栏
        function judgeClientWidth() {
            if (document.body.clientWidth < 700) {
                isInSmallClient = true;
                document.getElementsByClassName("leetcode-bottom-part")[0].style.display = "none"
                divMargin = 1
                divSize = (width - 2 * calendarLeftMargin) / maxColSize - divMargin
            } else {
                document.getElementsByClassName("leetcode-bottom-part")[0].style.display = "flex"
            }
        }
    }

    function removeAttribute() {
        document.getElementsByClassName('color-array')[0].removeAttribute('submit-gap')
        document.getElementById('leetcode-sub-calendar').removeAttribute('stamp-param')
    }
})()
