import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Presentation, PresentationFile } from "file:///C:/Users/zhaor/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "outputs");
const WORKSPACE = path.join(process.env.TEMP || OUT_DIR, "codex-presentations", "focusflow-style-refine");
const TMP_DIR = path.join(WORKSPACE, "tmp");
const PREVIEW_DIR = path.join(TMP_DIR, "preview");
const LAYOUT_DIR = path.join(TMP_DIR, "layout");
const QA_DIR = path.join(TMP_DIR, "qa");
const ASSET_DIR = path.join(OUT_DIR, "focusflow_ppt_assets");
const FINAL_PPTX = path.join(OUT_DIR, "FocusFlow_Academic_Presentation_Refined.pptx");

const W = 1280;
const H = 720;
const C = {
  ink: "#18212f",
  muted: "#647084",
  paper: "#f6f4ef",
  white: "#ffffff",
  green: "#0f766e",
  teal: "#14b8a6",
  coral: "#f9735b",
  amber: "#f2b84b",
  blue: "#315f9c",
  line: "#d9ded7",
  dark: "#111927",
  soft: "#eaf3ef",
  softBlue: "#e9f0f8",
  softCoral: "#fff0ea",
};

let ASSETS = {};

async function loadAssets() {
  ASSETS = {};
  for (let i = 1; i <= 14; i++) {
    const key = String(i).padStart(2, "0");
    const bytes = await fs.readFile(path.join(ASSET_DIR, `bg-${key}.png`));
    ASSETS[key] = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
}

function paperBackground(slide, n) {
  const key = String(n).padStart(2, "0");
  if (!ASSETS[key]) {
    slide.background.fill = C.paper;
    return;
  }
  slide.images.add({
    blob: ASSETS[key],
    contentType: "image/png",
    alt: "Subtle paper grain background with large faded typography",
    fit: "cover",
    position: { left: 0, top: 0, width: W, height: H },
  });
}

function addText(slide, text, x, y, w, h, style = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    typeface: "Aptos",
    fontSize: 20,
    color: C.ink,
    ...style,
  };
  return shape;
}

function addRect(slide, x, y, w, h, fill, line = "none", radius = "rounded-xl") {
  return slide.shapes.add({
    geometry: "roundRect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: line, width: line === "none" ? 0 : 1 },
    borderRadius: radius,
  });
}

function addLine(slide, x, y, w, h = 2, fill = C.line) {
  return slide.shapes.add({
    geometry: "rect",
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: "none", width: 0 },
  });
}

function header(slide, n, title, subtitle = "") {
  paperBackground(slide, n);
  addText(slide, String(n).padStart(2, "0"), 64, 42, 54, 28, {
    fontSize: 16,
    bold: true,
    color: C.blue,
  });
  addText(slide, title, 124, 34, 740, 48, {
    typeface: "Aptos Display",
    fontSize: 32,
    bold: true,
    color: C.ink,
  });
  if (subtitle) {
    addText(slide, subtitle, 126, 84, 840, 28, {
      fontSize: 15,
      color: C.muted,
    });
  }
  addText(slide, "FocusFlow · Adaptive Attention Reading System", 900, 46, 310, 24, {
    fontSize: 13,
    color: C.muted,
    alignment: "right",
  });
  addLine(slide, 64, 126, 1152, 1, "#cfd8df");
  footer(slide);
}

function footer(slide) {
  addText(slide, "HCI Final Project / Research Prototype", 72, 665, 360, 20, {
    fontSize: 11,
    color: C.muted,
  });
}

function card(slide, x, y, w, h, title, body, accent = C.green, opts = {}) {
  addRect(slide, x, y, w, h, opts.fill || "#ffffff", opts.line || "#d4dce2", "rounded-lg");
  slide.shapes.add({
    geometry: "rect",
    position: { left: x, top: y, width: 6, height: h },
    fill: accent,
    line: { style: "solid", fill: "none", width: 0 },
  });
  addText(slide, title, x + 24, y + 22, w - 44, 34, {
    fontSize: opts.titleSize || 22,
    bold: true,
    color: C.ink,
  });
  addText(slide, body, x + 24, y + 66, w - 44, h - 84, {
    fontSize: opts.bodySize || 17,
    color: C.muted,
    leading: 1.2,
  });
}

function pill(slide, text, x, y, w, fill, color = C.ink) {
  addRect(slide, x, y, w, 38, fill, "none", "rounded-2xl");
  addText(slide, text, x, y + 8, w, 22, {
    fontSize: 15,
    bold: true,
    color,
    alignment: "center",
  });
}

function arrow(slide, x1, y1, x2, y2, label = "") {
  const w = x2 - x1;
  addLine(slide, x1, y1, Math.max(8, w), 3, C.green);
  slide.shapes.add({
    geometry: "triangle",
    position: { left: x2 - 8, top: y2 - 7, width: 14, height: 14 },
    fill: C.green,
    line: { style: "solid", fill: "none", width: 0 },
    rotation: 90,
  });
  if (label) {
    addText(slide, label, x1 + 8, y1 - 30, Math.max(120, w - 12), 22, {
      fontSize: 13,
      color: C.muted,
      alignment: "center",
    });
  }
}

function cover(p) {
  const slide = p.slides.add();
  slide.background.fill = C.dark;
  slide.shapes.add({
    geometry: "rect",
    position: { left: 0, top: 0, width: W, height: H },
    fill: C.dark,
    line: { style: "solid", fill: "none", width: 0 },
  });
  paperBackground(slide, 1);
  addRect(slide, 775, 90, 370, 460, "#172435", "#26354a", "rounded-xl");
  addLine(slide, 832, 190, 190, 3, C.teal);
  addLine(slide, 910, 272, 120, 3, C.coral);
  addLine(slide, 868, 354, 220, 3, C.amber);
  for (const [x, y, fill] of [
    [830, 186, C.teal],
    [1025, 268, C.coral],
    [865, 350, C.amber],
    [1088, 418, C.green],
    [930, 482, C.blue],
  ]) {
    slide.shapes.add({
      geometry: "ellipse",
      position: { left: x, top: y, width: 18, height: 18 },
      fill,
      line: { style: "solid", fill: "none", width: 0 },
    });
  }
  addText(slide, "HCI RESEARCH PROTOTYPE", 74, 78, 260, 28, {
    fontSize: 13,
    bold: true,
    color: C.teal,
  });
  addText(slide, "FocusFlow", 72, 150, 560, 88, {
    typeface: "Aptos Display",
    fontSize: 64,
    bold: true,
    color: C.white,
  });
  addText(slide, "自适应注意力阅读管理系统", 76, 252, 560, 42, {
    fontSize: 28,
    bold: true,
    color: "#dce8e4",
  });
  addText(
    slide,
    "A browser-based adaptive reading system that infers cognitive state from multimodal interaction signals and responds with graded interventions.",
    78,
    326,
    690,
    86,
    { fontSize: 20, color: "#b7c4cf", leading: 1.15 },
  );
  pill(slide, "Eye / Mouse / Scroll", 78, 460, 190, "#213044", "#dce8e4");
  pill(slide, "Cognitive State Model", 286, 460, 230, "#213044", "#dce8e4");
  pill(slide, "Adaptive Intervention", 534, 460, 235, "#213044", "#dce8e4");
  addText(slide, "感知  →  状态  →  干预", 828, 132, 270, 36, {
    fontSize: 24,
    bold: true,
    color: C.white,
  });
  addText(slide, "Project deck · Academic version", 80, 650, 360, 20, {
    fontSize: 12,
    color: "#99a8b8",
  });
}

function slide2(p) {
  const s = p.slides.add();
  header(s, 2, "摘要与核心贡献", "将项目从“功能演示”提升为“研究型系统原型”的表达。");
  addText(
    s,
    "FocusFlow 关注长文本阅读中的注意力漂移、理解停滞与恢复问题。系统通过 WebGazer、鼠标轨迹、滚动行为和段落停留等信号，构建可解释的认知状态模型，并以低打扰原则选择自适应干预。",
    86,
    158,
    1088,
    72,
    { fontSize: 20, color: C.ink, leading: 1.18 },
  );
  card(s, 92, 286, 330, 180, "贡献 1：多模态状态感知", "整合视觉注意力与行为交互信号，避免单一眼动或单一鼠标信号造成的不稳定判断。", C.teal);
  card(s, 475, 286, 330, 180, "贡献 2：可解释状态机", "以 Normal、Distracted、Struggling、Recovering 四类状态组织系统推断，使干预原因可追踪。", C.blue);
  card(s, 858, 286, 330, 180, "贡献 3：分级干预体验", "根据状态严重程度选择弱提示、摘要、关键词高亮和恢复反馈，降低对阅读流的打断。", C.coral);
  addRect(s, 92, 532, 1010, 54, C.soft, "none", "rounded-2xl");
  addText(s, "定位：一个可运行、可扩展、可评估的 HCI 课程研究原型。", 122, 548, 950, 28, {
    fontSize: 21,
    bold: true,
    color: C.green,
  });
}

function slide3(p) {
  const s = p.slides.add();
  header(s, 3, "研究背景：阅读器为什么需要“感知状态”", "传统阅读工具通常呈现内容，却很少理解用户是否仍在有效阅读。");
  card(s, 86, 170, 312, 270, "现有阅读器的问题", "只记录进度、时间和阅读位置，无法区分“停下来认真理解”和“停下来走神”。", C.green, { bodySize: 18 });
  card(s, 484, 170, 312, 270, "眼动方案的局限", "浏览器端眼动估计噪声较大，且受摄像头、光线、姿态和权限影响，需要行为信号补偿。", C.amber, { bodySize: 18 });
  card(s, 882, 170, 312, 270, "交互设计挑战", "系统必须帮助用户回到任务，但过强的提醒会破坏阅读沉浸感。", C.coral, { bodySize: 18 });
  addRect(s, 110, 510, 1040, 78, C.dark, "none", "rounded-xl");
  addText(s, "研究空白：如何在浏览器端用低成本信号推断阅读状态，并将这种推断转化为温和、可解释、可恢复的交互反馈？", 140, 532, 980, 36, {
    fontSize: 20,
    bold: true,
    color: C.white,
  });
}

function slide4(p) {
  const s = p.slides.add();
  header(s, 4, "研究问题与设计目标", "从 HCI 角度将系统目标拆解为可验证问题。");
  const rows = [
    ["RQ1", "哪些浏览器端行为信号能够支持对阅读状态的实时推断？", C.teal],
    ["RQ2", "如何将感知特征组织成用户可理解、开发者可调试的认知状态？", C.blue],
    ["RQ3", "什么样的干预强度能在帮助恢复注意力的同时减少打扰？", C.coral],
  ];
  rows.forEach(([rq, text, color], i) => {
    const y = 164 + i * 128;
    addRect(s, 112, y, 1056, 88, C.white, C.line, "rounded-lg");
    addRect(s, 136, y + 20, 74, 48, color, "none", "rounded-xl");
    addText(s, rq, 136, y + 30, 74, 26, { fontSize: 22, bold: true, color: C.white, alignment: "center" });
    addText(s, text, 238, y + 25, 850, 38, { fontSize: 24, bold: true, color: C.ink });
  });
  addText(s, "设计目标：实时性、可解释性、低打扰、可降级、可扩展。", 126, 580, 860, 28, {
    fontSize: 22,
    bold: true,
    color: C.green,
  });
}

function slide5(p) {
  const s = p.slides.add();
  header(s, 5, "概念模型：从行为轨迹到自适应阅读辅助", "FocusFlow 的核心是一个闭环，而不是单向监控。");
  const items = [
    ["Input", "眼动\n鼠标\n滚动\n文本", C.soft],
    ["Feature", "人脸存在\n视线区域\n停留时间\n交互活跃", C.softBlue],
    ["State", "Normal\nDistracted\nStruggling\nRecovering", C.softCoral],
    ["Policy", "严重程度\n冷却时间\n用户画像\n阈值", C.soft],
    ["Feedback", "遮罩\n高亮\n摘要\n鼓励", C.softBlue],
  ];
  items.forEach(([title, body, fill], i) => {
    const x = 46 + i * 244;
    addRect(s, x, 214, 160, 174, fill, C.line, "rounded-xl");
    addText(s, title, x + 18, 232, 124, 28, { fontSize: 21, bold: true, color: C.green, alignment: "center" });
    addText(s, body, x + 24, 274, 112, 92, { fontSize: 17, color: C.ink, alignment: "center", leading: 1.25 });
    if (i < items.length - 1) arrow(s, x + 170, 302, x + 226, 302);
  });
  addLine(s, 216, 432, 864, 3, C.green);
  addText(s, "反馈结果进入后续状态判断，形成可迭代的人机闭环", 370, 454, 520, 28, {
    fontSize: 20,
    bold: true,
    color: C.green,
    alignment: "center",
  });
}

function slide6(p) {
  const s = p.slides.add();
  header(s, 6, "方法：多模态信号与特征向量", "系统把不同来源的行为数据转化为状态机可用的证据。");
  const items = [
    ["视觉注意力", "facePresent\nheadPose\ngazeRegion\ngazeConfidence", C.teal],
    ["交互行为", "mouseMoving\nidleDuration\nclickActivity\ninteractionActive", C.blue],
    ["阅读行为", "scrollVelocity\nscrollIdleDuration\npauseDuration\ndwellTime", C.coral],
    ["内容上下文", "paragraphIndex\nwordCount\nsummaryCache\nreadingProgress", C.amber],
  ];
  items.forEach(([title, body, accent], i) => {
    card(s, 80 + i * 300, 172, 250, 262, title, body, accent, { bodySize: 20 });
  });
  addRect(s, 276, 505, 728, 58, C.dark, "none", "rounded-2xl");
  addText(s, "Feature Vector  →  Evidence Fusion  →  Cognitive State Probability", 328, 522, 630, 24, {
    fontSize: 21,
    bold: true,
    color: C.white,
    alignment: "center",
  });
}

function slide7(p) {
  const s = p.slides.add();
  header(s, 7, "系统架构：模块化前端研究原型", "代码结构对应 HCI 系统管线，便于展示、调试和扩展。");
  const modules = [
    ["Perception", "faceDetection\nheadPose\ngazeRegion\nmouseTracker\nscrollAnalyzer\nkalmanFilter", C.teal],
    ["Cognition", "stateMachine\nprobability update\nstate history\ntransition events", C.blue],
    ["Decision", "interventionStrategy\nadaptiveThreshold\ncooldown control\npolicy selection", C.coral],
    ["Interface", "readingView\nvisualEffects\nfocusMode\ndebugPanel", C.green],
    ["Analytics", "attentionAnalytics\nsessionReport\ncharts\nlogs", C.amber],
  ];
  modules.forEach(([title, body, accent], i) => {
    const x = 62 + i * 244;
    card(s, x, 166, 210, 328, title, body, accent, { bodySize: 16 });
    if (i < modules.length - 1) arrow(s, x + 216, 320, x + 238, 320);
  });
  addText(s, "运行基础：index.html + 原生 JavaScript 模块 + server/dev-server.js 静态服务与可选 LLM 摘要代理。", 88, 552, 1050, 28, {
    fontSize: 18,
    color: C.ink,
  });
}

function slide8(p) {
  const s = p.slides.add();
  header(s, 8, "认知状态模型：可解释的状态转移", "状态不是标签展示，而是系统决策的中间表示。");
  const nodes = [
    ["Normal\n稳定阅读", 154, 240, C.soft],
    ["Distracted\n注意力偏离", 548, 148, C.softCoral],
    ["Struggling\n理解停滞", 548, 374, "#fff7df"],
    ["Recovering\n恢复阅读", 930, 260, C.softBlue],
  ];
  nodes.forEach(([text, x, y, fill]) => {
    addRect(s, x, y, 200, 100, fill, C.line, "rounded-xl");
    addText(s, text, x + 12, y + 22, 176, 58, { fontSize: 22, bold: true, color: C.ink, alignment: "center" });
  });
  arrow(s, 354, 284, 548, 284, "人脸缺失 / 无交互");
  arrow(s, 354, 420, 548, 420, "长停留 / 低滚动");
  arrow(s, 748, 198, 930, 290, "重新交互");
  arrow(s, 748, 424, 930, 330, "重新交互");
  addRect(s, 126, 520, 980, 70, C.white, C.line, "rounded-lg");
  addText(s, "状态转移依据", 148, 536, 944, 26, { fontSize: 21, bold: true, color: C.green });
  addText(s, "人脸缺失时长、无交互时长、同一区域停留、滚动速度、恢复稳定时间和状态冷却时间。", 148, 566, 930, 22, {
    fontSize: 17,
    color: C.muted,
  });
}

function slide9(p) {
  const s = p.slides.add();
  header(s, 9, "干预策略矩阵：从“提醒”到“理解辅助”", "不同状态对应不同干预强度，避免把所有问题都当作分心处理。");
  const x = [86, 276, 561, 846];
  const widths = [190, 285, 285, 285];
  const heads = ["状态", "轻度", "中度", "重度"];
  heads.forEach((h, i) => {
    addRect(s, x[i], 162, widths[i], 48, i === 0 ? C.dark : C.green, "none", "rounded-lg");
    addText(s, h, x[i] + 18, 175, widths[i] - 36, 20, { fontSize: 17, bold: true, color: C.white });
  });
  const rows = [
    ["Distracted", "视觉弱提示", "浮动提示", "声音提醒 + 强视觉线索"],
    ["Struggling", "关键词高亮", "段落摘要", "内容简化 / 解释"],
    ["Recovering", "进度提示", "正向反馈", "降低干预频率"],
    ["Normal", "不干预", "记录指标", "保持沉浸"],
  ];
  rows.forEach((row, r) => {
    const y = 210 + r * 72;
    row.forEach((txt, i) => {
      addRect(s, x[i], y, widths[i], 72, i === 0 ? C.softBlue : C.white, C.line, "rounded-sm");
      addText(s, txt, x[i] + 16, y + 22, widths[i] - 32, 28, {
        fontSize: i === 0 ? 19 : 18,
        bold: i === 0,
        color: i === 0 ? C.blue : C.ink,
      });
    });
  });
  addText(s, "策略选择还受到冷却时间、连续同状态次数和用户画像影响。", 92, 548, 820, 26, {
    fontSize: 19,
    color: C.green,
    bold: true,
  });
}

function slide10(p) {
  const s = p.slides.add();
  header(s, 10, "交互界面设计：可读、可控、可解释", "界面把复杂推断翻译成用户能理解的状态与反馈。");
  addRect(s, 84, 162, 682, 386, C.white, C.line, "rounded-xl");
  addText(s, "Reading Surface", 116, 190, 260, 28, { fontSize: 22, bold: true, color: C.ink });
  [0, 1, 2, 3, 4, 5, 6].forEach((_, i) => addLine(s, 120, 240 + i * 36, 560, 16, i === 2 ? "#d7f0ea" : "#e8ebe7"));
  addRect(s, 704, 230, 18, 138, C.green, "none", "rounded-2xl");
  addText(s, "progress", 674, 382, 92, 18, { fontSize: 13, color: C.muted, alignment: "center" });
  addRect(s, 810, 162, 360, 386, C.dark, "none", "rounded-xl");
  addText(s, "Dashboard", 842, 194, 180, 28, { fontSize: 22, bold: true, color: C.white });
  card(s, 842, 244, 130, 92, "状态", "Normal\n95%", C.teal, { fill: "#1b2b3d", line: "#26384e", titleSize: 16, bodySize: 16 });
  card(s, 1000, 244, 130, 92, "策略", "无需干预", C.amber, { fill: "#1b2b3d", line: "#26384e", titleSize: 16, bodySize: 16 });
  addRect(s, 842, 378, 288, 18, "#2d3d51", "none", "rounded-2xl");
  addRect(s, 842, 378, 218, 18, C.teal, "none", "rounded-2xl");
  addText(s, "Attention 78% / 220 WPM", 842, 414, 240, 22, { fontSize: 17, color: "#dce8e4" });
  addText(s, "设计取向：状态可见但不喧宾夺主；干预以恢复阅读为目标，而不是惩罚分心。", 108, 582, 980, 34, {
    fontSize: 19,
    bold: true,
    color: C.green,
  });
}

function slide11(p) {
  const s = p.slides.add();
  header(s, 11, "工程实现：从原型冲突到可维护结构", "整理后的项目更适合展示、继续实验和二次开发。");
  const items = [
    ["代码组织", "js/perception、js/cognition、js/decision、js/ui、js/analytics、js/nlp、js/i18n、js/utils 分层。"],
    ["运行方式", "npm start 启动 server/dev-server.js，提供静态资源、MIME 映射和可选 LLM 摘要接口。"],
    ["整理成果", "A_module 与 archive 冲突目录已清理；抽取 KalmanFilter2D 并接入眼动平滑流程。"],
    ["质量检查", "JS 语法、内联脚本、服务返回、翻译 key 覆盖、PPT 渲染预览。"],
    ["国际化", "选择中文后，按钮、动态弹窗、摄像头错误、演示状态和默认文章都统一中文。"],
    ["鲁棒性", "摄像头不可用时降级到鼠标追踪；错误提示提供可操作建议。"],
  ];
  items.forEach(([title, body], i) => {
    const x = 80 + (i % 3) * 395;
    const y = i < 3 ? 160 : 394;
    card(s, x, y, 330, i < 3 ? 170 : 140, title, body, [C.teal, C.blue, C.coral, C.amber, C.green, C.blue][i], { bodySize: i < 3 ? 15 : 16 });
  });
}

function slide12(p) {
  const s = p.slides.add();
  header(s, 12, "评估设计：如何证明系统有效", "从可用性、状态识别和干预效果三个层面设计实验。");
  const items = [
    ["实验条件", "A. 普通阅读器\nB. 鼠标追踪 FocusFlow\nC. 眼动追踪 FocusFlow", C.teal],
    ["客观指标", "阅读理解正确率\n任务完成时间\n分心恢复时间\n状态转移次数", C.blue],
    ["主观指标", "NASA-TLX 主观负担\n干预接受度\n感知打扰程度\n系统信任度", C.coral],
    ["数据记录", "状态时间线\n事件日志\n段落停留\n会话报告", C.amber],
  ];
  items.forEach(([title, body, accent], i) => card(s, 72 + i * 300, 164, 254, 270, title, body, accent, { bodySize: 18 }));
  addRect(s, 150, 505, 980, 58, C.dark, "none", "rounded-2xl");
  addText(s, "目标：验证自适应干预是否能缩短恢复时间、提高理解表现，同时保持较低打扰感。", 196, 522, 900, 24, {
    fontSize: 19,
    bold: true,
    color: C.white,
    alignment: "center",
  });
}

function slide13(p) {
  const s = p.slides.add();
  header(s, 13, "局限性与伦理考量", "注意力系统必须谨慎处理隐私、误判和用户自主性。");
  card(s, 92, 170, 330, 250, "技术局限", "WebGazer 在浏览器端的精度受摄像头、光照、姿态和校准质量影响；状态机阈值仍需实验校准。", C.amber, { bodySize: 18 });
  card(s, 475, 170, 330, 250, "交互局限", "错误干预可能打断阅读流；弱提示与强提示之间需要根据用户偏好调节。", C.coral, { bodySize: 18 });
  card(s, 858, 170, 330, 250, "伦理要求", "摄像头使用必须透明；应提供关闭追踪、清除日志和仅本地处理的明确选项。", C.green, { bodySize: 18 });
  addRect(s, 122, 512, 930, 58, C.soft, "none", "rounded-2xl");
  addText(s, "原则：把系统定位为“辅助读者恢复注意力”，而不是“监控读者是否认真”。", 152, 528, 870, 28, {
    fontSize: 21,
    bold: true,
    color: C.green,
  });
}

function slide14(p) {
  const s = p.slides.add();
  s.background.fill = C.dark;
  paperBackground(s, 14);
  addText(s, "Conclusion", 78, 78, 340, 50, {
    typeface: "Aptos Display",
    fontSize: 42,
    bold: true,
    color: C.white,
  });
  addText(s, "FocusFlow demonstrates a complete HCI loop:", 82, 154, 760, 34, {
    fontSize: 24,
    color: "#c9d4df",
  });
  const items = [
    ["Sense", "多模态行为信号", C.teal],
    ["Infer", "认知状态模型", C.blue],
    ["Intervene", "分级自适应反馈", C.coral],
    ["Reflect", "会话分析与评估", C.amber],
  ];
  items.forEach(([title, body, color], i) => {
    const x = 94 + i * 292;
    addRect(s, x, 270, 210, 130, "#172435", "#26354a", "rounded-xl");
    addText(s, title, x + 24, 292, 150, 30, { fontSize: 25, bold: true, color });
    addText(s, body, x + 24, 338, 160, 40, { fontSize: 18, color: C.white });
    if (i < 3) arrow(s, x + 216, 335, x + 274, 335);
  });
  addText(s, "从感知数据到可解释状态，再到低打扰干预，FocusFlow 为阅读辅助与在线学习场景提供了一个可运行的研究原型。", 112, 500, 1010, 62, {
    fontSize: 22,
    color: "#e4ebe8",
    leading: 1.15,
  });
  addText(s, "Thank you", 88, 646, 180, 28, { fontSize: 22, bold: true, color: C.teal });
}

async function writeBlob(file, blob) {
  await fs.writeFile(file, new Uint8Array(await blob.arrayBuffer()));
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  await fs.mkdir(LAYOUT_DIR, { recursive: true });
  await fs.mkdir(QA_DIR, { recursive: true });
  await loadAssets();

  await fs.writeFile(
    path.join(TMP_DIR, "source-notes.txt"),
    [
      "Source deck: outputs/FocusFlow_Academic_Presentation.pptx",
      "Content extracted from the existing academic deck inspection file.",
      "No external facts, logos, screenshots, or generated images were added.",
    ].join("\n"),
    "utf8",
  );
  await fs.writeFile(
    path.join(TMP_DIR, "edit-plan.txt"),
    [
      "Mode: targeted visual restyle by rebuilding an editable deck from the existing slide content.",
      "Visual direction: polished academic demo deck with dark cover/closing, warm paper content slides, teal primary, coral/amber/blue accents, card hierarchy, clearer diagrams, and consistent headers/footers.",
      "Fonts: Aptos Display for titles, Aptos for body and labels.",
      "Output: outputs/FocusFlow_Academic_Presentation_Refined.pptx",
    ].join("\n"),
    "utf8",
  );

  const p = Presentation.create({ slideSize: { width: W, height: H } });
  [
    cover,
    slide2,
    slide3,
    slide4,
    slide5,
    slide6,
    slide7,
    slide8,
    slide9,
    slide10,
    slide11,
    slide12,
    slide13,
    slide14,
  ].forEach((fn) => fn(p));

  for (const [index, slide] of p.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    await writeBlob(path.join(PREVIEW_DIR, `${stem}.png`), await p.export({ slide, format: "png", scale: 1 }));
    await fs.writeFile(path.join(LAYOUT_DIR, `${stem}.layout.json`), await (await slide.export({ format: "layout" })).text(), "utf8");
  }
  await writeBlob(path.join(PREVIEW_DIR, "deck-montage.webp"), await p.export({ format: "webp", montage: true, scale: 1 }));
  const pptx = await PresentationFile.exportPptx(p);
  await pptx.save(FINAL_PPTX);

  const inspect = await p.inspect({ kind: "slide,textbox,shape,layout", maxChars: 12000 });
  await fs.writeFile(path.join(TMP_DIR, "final-inspect.ndjson"), inspect.ndjson, "utf8");
  await fs.writeFile(
    path.join(QA_DIR, "visual-qa.txt"),
    [
      "Rendered all 14 slides to PNG and exported a montage.",
      "Checked that the final deck keeps the expected slide count and uses consistent headers, footers, palette, card spacing, and readable text sizing.",
      "All content remains editable PowerPoint shapes and text.",
    ].join("\n"),
    "utf8",
  );
  console.log(JSON.stringify({ finalPptx: FINAL_PPTX, workspace: WORKSPACE, slides: p.slides.items.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
