# hexo-leetcode-calendar-for-butterfly

A [Hexo](https://hexo.io/) tag plugin that renders a LeetCode submission calendar (heatmap) plus
per-difficulty stats, with **automatic light/dark mode** support.

Built and tested against the [Butterfly](https://github.com/jerryc127/hexo-theme-butterfly) theme.
The dark-mode detection itself is theme-agnostic (it reads `<html data-theme>` / the theme's class /
the system preference), so other themes work as well.

Only [leetcode.cn](https://leetcode.cn) (力扣) accounts are supported — `leetcode.com` is not.

> **Fork notice.** This is a maintained fork of
> [PPLong222/hexo-leetcode-calendar](https://github.com/PPLong222/hexo-leetcode-calendar)
> (MIT, © 2022 PPLong), which is no longer maintained and whose published version no longer works.
> See [Changes from upstream](#changes-from-upstream) for what was fixed here.

<div style="display: inline-block;">
    <a target="_blank" href="https://hexo.io/"><img height="20" src="https://img.shields.io/badge/Build-Hexo-blue?logo=Hexo&style=flat&logoColor=3686F0&color=3686F0"></a>
    <img height="20" src="https://img.shields.io/badge/Build-JavaScript-blue?logo=javascript&style=flat&logoColor=e1ea3d&color=f0a835">
    <a target="_blank" href="https://github.com/edwardlwang/hexo-leetcode-calendar-for-butterfly"><img height="20" src="https://img.shields.io/badge/Repo-Github-blue?logo=github&style=flat&logoColor=5fa1e7&color=5fa1e7"></a>
</div>

## What it renders

A GitHub-style contribution heatmap of the last year, with the total submission count, the date
range, and a per-difficulty panel (`accepted / total` for Easy, Medium, Hard). Hovering a cell shows
that day's submission count. Everything restyles itself when the reader switches the site between
light and dark mode.

## Install

This package is **not published on npm**. Install it straight from GitHub — from your Hexo site
directory:

```sh
npm install github:edwardlwang/hexo-leetcode-calendar-for-butterfly
```

Or from a local clone / checkout:

```sh
npm install /path/to/hexo-leetcode-calendar-for-butterfly
```

> When installing from a **local path**, npm only creates a symlink and does *not* install the
> dependency's own dependencies. Run `npm install` once inside the plugin folder too, otherwise
> `hexo g` fails with `Cannot find module 'superagent'`.

## Usage

Put the tag anywhere in a post or page:

```markdown
{% leetcode <username> %}
```

`<username>` is the **user slug**, i.e. the `xxxx` in `https://leetcode.cn/u/xxxx/` — not your
display name. A LeetCode nickname like `The Fool` will not work; the slug looks like
`elo9uent-vvescoffpwj`.

Then:

```sh
hexo clean && hexo g && hexo s
```

**Why is my calendar all grey / why does nothing show up?**
leetcode.cn has per-user profile visibility settings, and the submission calendar is only served for
accounts that have made their submissions public. If yours comes out empty, `hexo g` prints a warning
telling you so — make the submission record visible in your LeetCode profile settings and rebuild.

A single failing tag (unknown user, network error, missing username, ...) is logged and skipped;
it no longer aborts the whole build.

## Customize

Edit your **site** configuration file — that is `_config.yml` in the Hexo root, **not** your theme
config such as `_config.butterfly.yml`:

```yaml
leetcodecalendar: # ParentNode
  enable: true
  submitGap: 5    # every 5 submits will be divided into a level(to show in different color).
  showIcon: true  # show middle Leetcode icon
  color:
    # light mode
    submitColor: '#000' # submit count text color
    bgColor: '#fff'     # calendar background color
    subColors: ['#ebedf0', '#bef5cb', '#85e89d', '#34d058', '#1c992f']  # submit level color
    # dark mode (optional — used automatically when the site is in dark mode,
    # defaults are GitHub's dark contribution palette)
    darkSubmitColor: '#c9d1d9' # submit count text color in dark mode
    darkBgColor: '#161b22'     # calendar background color in dark mode
    darkSubColors: ['#21262d', '#0e4429', '#006d32', '#26a641', '#39d353'] # submit level color in dark mode
```

| Param           | Explain                                                      |
| --------------- | ------------------------------------------------------------ |
| enable          | enable plugin (false will show nothing)                      |
| submitGap       | every 5 submits will be divided into a level(to show in different color). |
| showIcon        | show middle Leetcode icon                                    |
| submitColor     | submit count text color                                      |
| bgColor         | calendar background color                                    |
| subColors       | submit level color                                           |
| darkSubmitColor | submit count text color in dark mode                         |
| darkBgColor     | calendar background color in dark mode                       |
| darkSubColors   | submit level color in dark mode                              |

## Dark mode

The calendar follows your theme automatically — no config needed. It picks the `dark*` colours above
whenever the page is in dark mode, and switches live when the reader toggles the theme: the heatmap is
drawn on a `<canvas>`, so the plugin re-draws it (the DOM colours come from CSS variables, the canvas
reads the same variables and repaints itself).

Dark mode is detected by, in order:

1. `<html data-theme="dark">` — what Butterfly, NexT and most themes use;
2. a `dark` / `dark-mode` / `darkmode` class on `<html>`;
3. the system preference `prefers-color-scheme: dark` when the theme marks nothing.

Only the `dark*` colour values are configurable. The greys (source line, month labels, separator
lines, hover tooltip) live in `templates/assets/style.css` under
`html[data-theme='dark'] .leetcode-calendar-wall` if you want to tune those too.

## Changes from upstream

The upstream package was last released in 2022 and its published `0.4.0` no longer builds a site at
all. Fixed here:

* **Domain migration.** `leetcode-cn.com` was renamed to `leetcode.cn`; the old host 301-redirects,
  and superagent downgrades a redirected `POST` to a body-less `GET`, so the GraphQL call returned
  HTTP 400. All requests now go straight to `leetcode.cn`.
* **A failing tag no longer kills the build.** The rejected request was unhandled, which under
  Node ≥ 15 crashes the whole `hexo g` process. Failures are now logged and that one calendar is
  skipped.
* **GraphQL field follow-up.** Prefers `userProfileUserQuestionProgressV2` and falls back to the
  legacy field automatically if the server ever renames it again.
* **Dark mode** (new): see above.
* **Smaller fixes**: difficulty counts are matched by `difficulty` instead of array order; totals are
  summed explicitly; weekday labels no longer inherit the last cell's fill colour; template values
  containing `$&` no longer corrupt the output; the `stamp-param` attribute is quoted.

## Features

* Light/dark mode aware, including a live redraw on theme toggle.
* Customisable palette, submission gap and logo for both modes.
* Degrades gracefully: one broken tag does not break the build.
* Reasonably responsive — the bottom stats panel is hidden on narrow screens.

## TODO

* Support multiple calendars on the same page (currently the first one wins).
* Make the UI strings (「过去一年提交数」「次提交」...) translatable.
* Follow the container width on resize instead of only measuring once at load.
* Reformat `templates/assets/loadPanel.js` — it still carries upstream's implicit globals.

## Thanks

Upstream credits [hexo-douban-card](https://github.com/TankNee/hexo-douban-card) and
[hexo-githubcalendar](https://github.com/Zfour/hexo-github-calendar) for the original ideas, and
PPLong for writing the plugin this fork is based on.
