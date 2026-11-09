// Muse 使用额度小组件 (Scriptable)
// ------------------------------------------------------------
// 用法:把整个文件粘贴进 iPhone 的 Scriptable App,新建一个脚本,
// 然后在桌面添加 Scriptable 小组件并选择这个脚本即可。
// 数据来源:GitHub 公开仓库里的 usage.json,由 Muse 每小时自动更新。
// 小组件点按会打开 Muse 官网;每 30 分钟自动刷新一次。
// ------------------------------------------------------------

const DATA_URL = "https://raw.githubusercontent.com/Jennydady2019/my-news/master/muse-usage.json"
const CACHE_FILE = "muse-usage-cache.json"

// ---------- 取数据:先联网拉,失败则读本地缓存 ----------
const fm = FileManager.local()
const cachePath = fm.joinPath(fm.documentsDirectory(), CACHE_FILE)

let data = null
let fromCache = false
try {
  const req = new Request(DATA_URL)
  req.timeoutInterval = 10
  data = await req.loadJSON()
  fm.writeString(cachePath, JSON.stringify(data))
} catch (e) {
  if (fm.fileExists(cachePath)) {
    try {
      data = JSON.parse(fm.readString(cachePath))
      fromCache = true
    } catch (e2) {}
  }
}

// ---------- 工具函数 ----------
function p2(n) { return String(n).padStart(2, "0") }

function fmtUpdated(iso) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return `${d.getMonth() + 1}-${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}

function countdownText(resetAt) {
  const ms = new Date(resetAt).getTime() - Date.now()
  if (isNaN(ms)) return ""
  if (ms <= 0) return "已重置,等待新数据"
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (d > 0) return `还有 ${d} 天 ${h} 小时重置`
  if (h > 0) return `还有 ${h} 小时 ${m} 分钟重置`
  return `还有 ${m} 分钟重置`
}

function barImage(width, pct) {
  const h = 8
  const ctx = new DrawContext()
  ctx.size = new Size(width, h)
  ctx.opaque = false
  ctx.setFillColor(new Color("#8e8e93", 0.35))
  const bgPath = new Path()
  bgPath.addRoundedRect(new Rect(0, 0, width, h), h / 2, h / 2)
  ctx.addPath(bgPath)
  ctx.fillPath()
  const color = pct < 50 ? "#30d158" : pct < 80 ? "#ff9f0a" : "#ff453a"
  const w = Math.max(h, width * pct / 100)
  ctx.setFillColor(new Color(color))
  const fgPath = new Path()
  fgPath.addRoundedRect(new Rect(0, 0, w, h), h / 2, h / 2)
  ctx.addPath(fgPath)
  ctx.fillPath()
  return ctx.getImage()
}

// ---------- 画小组件 ----------
const widget = new ListWidget()
const dark = Device.isUsingDarkAppearance()
const bg = dark ? new Color("#1c1c1e") : new Color("#ffffff")
const fg = dark ? new Color("#ffffff") : new Color("#000000")
const sub = dark ? new Color("#a1a1a6") : new Color("#8e8e93")
widget.backgroundColor = bg
widget.setPadding(14, 16, 12, 16)
widget.url = "https://muse.ai"
widget.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000)

const family = config.widgetFamily || "medium"
const barW = family === "small" ? 121 : 300

function addLine(text, size, color, bold) {
  const t = widget.addText(text)
  t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size)
  t.textColor = color
  return t
}

if (!data) {
  addLine("Muse", 14, fg, true)
  widget.addSpacer(8)
  addLine("额度数据获取失败", 13, fg, false)
  widget.addSpacer(4)
  addLine("请检查网络后稍候", 11, sub, false)
  widget.addSpacer()
  addLine("点按打开 Muse", 10, sub, false)
} else {
  const pct = data.usage_percent != null ? data.usage_percent : 0

  const header = widget.addStack()
  const title = header.addText("Muse")
  title.font = Font.boldSystemFont(14)
  title.textColor = fg
  header.addSpacer()
  const plan = header.addText(data.plan || "免费版")
  plan.font = Font.systemFont(12)
  plan.textColor = sub

  widget.addSpacer(4)
  const row = widget.addStack()
  row.bottomAlignContent()
  const big = row.addText(pct + "%")
  big.font = Font.boldSystemFont(family === "small" ? 32 : 38)
  big.textColor = fg
  row.addSpacer(6)
  const lbl = row.addText("本周已用")
  lbl.font = Font.systemFont(12)
  lbl.textColor = sub

  widget.addSpacer(6)
  const bar = widget.addImage(barImage(barW, pct))
  bar.imageSize = new Size(barW, 8)
  widget.addSpacer(8)

  addLine(`剩余 ${100 - pct}% · ${data.reset_text || ""} 重置`, 12, fg, false)
  widget.addSpacer(2)
  addLine(countdownText(data.reset_at), 12, sub, false)

  if (family !== "small") {
    widget.addSpacer(4)
    addLine(`额外额度 ${data.extra_used_percent != null ? data.extra_used_percent : 0}% 已用 · 剩 ${data.extra_left || "-"}`, 12, sub, false)
  }

  widget.addSpacer()
  addLine(`更新于 ${fmtUpdated(data.updated_at)}${fromCache ? "（离线缓存）" : ""}`, 10, sub, false)
}

// ---------- 显示 ----------
if (config.runsInWidget) {
  Script.setWidget(widget)
} else if (family === "small") {
  await widget.presentSmall()
} else if (family === "large") {
  await widget.presentLarge()
} else {
  await widget.presentMedium()
}
Script.complete()
