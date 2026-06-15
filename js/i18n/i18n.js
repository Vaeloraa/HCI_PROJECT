/**
 * FocusFlow - Internationalization (i18n)
 * Supports English / Chinese UI switching.
 */

const I18n = {
    lang: 'en',
    translations: {
        en: {
            'app.title': 'FocusFlow — Adaptive Attention Management System',
            'app.tagline': 'Adaptive Attention Reading System',
            'lang.en': 'EN',
            'lang.zh': '中文',
            'lang.current': 'English',

            'btn.import': 'Import Text',
            'btn.reset': 'Reset',
            'reset.done': 'Reset complete',
            'reset.hint': 'Cognitive state and interventions cleared',
            'btn.theme.dark': 'Dark',
            'btn.theme.light': 'Light',
            'btn.clear': 'Clear',
            'btn.cancel': 'Cancel',
            'btn.enableCamera': 'Enable Camera',
            'btn.startCamera': 'Start Camera',
            'btn.paragraphDebug': '¶ Debug',
            'btn.paragraphDebugOn': '¶ Debug ON',
            'btn.sessionReport': 'Session Report',

            'comprehension.title': 'Paragraph Overview',
            'comprehension.meta': 'Paragraph {index}',
            'comprehension.hint': '',
            'comprehension.loading': 'Generating overview with AI…',
            'comprehension.generate': 'Summarize',
            'comprehension.reopen': 'Show overview',
            'comprehension.translateAi': 'AI Translate',
            'comprehension.translating': 'Translating…',
            'comprehension.translated': 'Translated',
            'comprehension.hideTranslation': 'Hide translation',
            'comprehension.showTranslation': 'Show translation',

            'report.title': 'Reading Session Report',
            'report.duration': 'Duration',
            'report.attention': 'Attention',
            'report.distractions': 'Distractions',
            'report.recovery': 'Avg Recovery',
            'report.heatmapTitle': 'Paragraph Attention Heatmap',
            'report.heatmapHint': 'Bar length = time spent on each paragraph.',
            'report.timelineTitle': 'Cognitive State Time Share',
            'report.timelineHint': 'Share of session time spent in each cognitive state.',
            'report.assistTitle': 'Comprehension Assists',
            'report.assistCount': 'Summary cards shown: {count}',
            'report.paragraphLabel': 'P{index}',
            'report.noData': 'Not enough data yet — read a bit longer.',
            'report.export': 'Export JSON',
            'report.close': 'Close',

            'reading.area': 'Reading Area',
            'reading.loading': 'Loading reading content...',
            'reading.translateAll': 'Translate All (AI)',
            'reading.translateAllProgress': 'Translating {current}/{total}…',
            'reading.translateDone': 'Translation complete',
            'reading.translateError': 'Translation failed',
            'reading.hideAllTranslations': 'Hide all translations',
            'reading.showAllTranslations': 'Show all translations',
            'reading.keywords': 'Paragraph Keywords',
            'reading.keyTerms': 'Key Terms',
            'reading.phrase': 'phrase',

            'timer.title': 'Reading timer',
            'timer.start': 'Start or pause',
            'timer.mode': 'Toggle count-up / countdown',
            'timer.modeUpTitle': 'Count-up mode — click to switch to countdown',
            'timer.modeDownTitle': 'Countdown {min} min — click to switch to count-up',
            'timer.presetHint': 'Countdown {min} min — click to change duration',
            'timer.countUpHint': 'Elapsed reading time',
            'timer.reset': 'Reset',
            'timer.timeUp.title': 'Time is up!',
            'timer.timeUp.sub': 'This reading session has ended. Take a short break.',

            'gaze.toggle': 'Show or hide the gaze position indicator on screen',

            'camera.title': 'Eye Tracking',
            'camera.kicker': 'WebGazer face mesh preview',
            'camera.waiting': 'Waiting for permission',
            'camera.notConnected': 'Not connected',
            'camera.previewBadge': '4:3 Preview',
            'camera.emptyTitle': 'Camera preview',
            'camera.emptySub': 'Switch to Eye mode in the header to show the WebGazer face mesh here.',
            'camera.inputSource': 'Input Source',
            'camera.trackingStatus': 'Tracking Status',
            'camera.visualFeedback': 'Visual Feedback',
            'camera.cursorMeaning': 'Cursor Meaning',
            'camera.greenMesh': 'Green Mesh',
            'camera.realGaze': 'Real Gaze',
            'camera.gate.title': 'Enable eye tracking',
            'camera.gate.prompt': 'FocusFlow needs camera access for WebGazer eye tracking. Click the button below — your browser will ask for permission.',
            'camera.gate.denied': 'Camera permission was blocked. Allow camera access in your browser settings, then click retry.',
            'camera.gate.file': 'Open this page through a local server instead of file://. Run npm start, then open http://127.0.0.1:8080.',
            'camera.gate.unsupported': 'This browser does not support the camera API. Use Chrome, Edge, or Firefox.',
            'camera.gate.enable': 'Enable Camera & Calibrate',
            'camera.gate.retry': 'Retry Camera',
            'camera.gate.working': 'Starting camera...',
            'camera.suggest.allowAddressBar': 'Click the lock or camera icon in the address bar and allow camera access',
            'camera.suggest.resetPermission': 'If you denied permission before, reset it in browser site settings',
            'camera.suggest.retryButton': 'Click "Enable Camera" or "Retry Camera" after allowing permission',
            'camera.suggest.useLocalhost': 'Open http://127.0.0.1:8080 or http://localhost:8080 (not file://)',
            'camera.suggest.useChromeEdge': 'Use the latest Chrome, Edge, or Firefox for best compatibility',
            'camera.suggest.closeOtherApps': 'Close other apps that may be using the camera (Zoom, Teams, etc.)',
            'camera.suggest.connectCamera': 'Connect a webcam and make sure it is not disabled in system settings',

            'state.title': 'State',
            'state.cognitive': 'Cognitive State',
            'state.intervention': 'Intervention',
            'state.focusedReading': 'Focused reading',
            'state.noIntervention': 'No intervention',
            'state.waitingChanges': 'Waiting for state changes...',
            'state.Normal': 'Normal',
            'state.Distracted': 'Distracted',
            'state.Struggling': 'Struggling',
            'state.Focus': 'Focus',
            'state.LowDistraction': 'Low Distraction',
            'state.HighDistraction': 'High Distraction',
            'state.LowStruggling': 'Low Difficulty',
            'state.HighStruggling': 'High Difficulty',
            'state.Idle': 'Transitioning',
            'state.OffScreen': 'Off Screen',
            'state.desc.Normal': 'Focused and reading',
            'state.desc.Distracted': 'Attention drifted away',
            'state.desc.Struggling': 'Having difficulty with content',
            'state.desc.Focus': 'Focused and reading',
            'state.desc.LowDistraction': 'Attention drifted — under 6s',
            'state.desc.HighDistraction': 'Attention drifted — over 6s',
            'state.desc.LowStruggling': 'Stuck on paragraph — under 8s',
            'state.desc.HighStruggling': 'Stuck on paragraph — over 8s',
            'state.desc.Idle': 'Waiting for stable state',
            'state.desc.OffScreen': 'Away from screen',
            'state.hint.Normal': 'Pointer on reading content, engaged',
            'state.hint.Distracted': 'Left reading area, face absent, or idle away',
            'state.hint.Struggling': 'Long dwell on paragraph without scroll progress',
            'state.hint.Focus': 'Pointer/gaze on reading content, engaged',
            'state.hint.LowDistraction': 'Distraction under 6s — prompt at 6s',
            'state.hint.HighDistraction': 'Distraction over 6s — alert at 12s',
            'state.hint.LowStruggling': 'Difficulty under 8s — keywords highlighted',
            'state.hint.HighStruggling': 'Difficulty over 8s — summary at 8s',
            'state.hint.Idle': 'Intermediate state — no action, waiting',
            'state.hint.Distracted.exit': 'Returns when pointer/gaze re-enters reading area',
            'state.hint.Struggling.exit': 'Leaves when switching paragraph; leaving reading area → distracted',

            'metrics.title': 'Attention Metrics',
            'metrics.attention': 'Attention',
            'metrics.speed': 'Speed',
            'metrics.focusRatio': 'Focus Ratio',
            'metrics.regression': 'Regression',
            'metrics.duration': 'Duration',
            'metrics.distractions': 'Distractions',
            'metrics.wpm': 'wpm',
            'metrics.min': 'min',
            'metrics.perMin': '/min',

            'features.title': 'Perception Features',
            'features.face': 'Face',
            'features.head': 'Head',
            'features.gaze': 'Gaze',
            'features.mouse': 'Mouse',
            'features.scroll': 'Scroll',
            'features.dwell': 'Dwell',
            'features.dispersion': 'Dispersion',
            'features.interaction': 'Interaction',

            'chart.stateProb': 'State Probability Distribution',
            'chart.timeline': 'State Timeline',
            'chart.stateShare': 'State Time Share',
            'chart.waiting': 'Waiting for data...',
            'log.title': 'Event Log',
            'log.ready': 'System ready, waiting to start...',

            'focus.standard': 'Standard',
            'focus.deep': 'Deep Focus',
            'focus.standardTitle': 'Standard Mode',
            'focus.deepTitle': 'Deep Focus — hide sidebar',

            'tracking.mouse': 'Mouse',
            'tracking.gaze': 'Eye',
            'tracking.mouseTitle': 'Mouse tracking (no camera)',
            'tracking.gazeTitle': 'Eye tracking (camera required)',

            'welcome.title': 'Welcome to FocusFlow!',
            'welcome.sub': 'Mouse tracking is active by default. Use the header bar to switch focus mode, tracking input, or language.',

            'calibration.title': 'WebGazer Calibration',
            'calibration.instruction': 'Look at the highlighted point, then click or press Space.',
            'calibration.point': 'Point {current} / {total}',
            'calibration.waiting': 'Waiting...',
            'calibration.skip': 'Skip calibration',
            'calibration.complete.title': 'Calibration complete!',
            'calibration.complete.sub': 'Gaze tracking calibrated with {accuracy}px avg. accuracy.',
            'calibration.skipped.title': 'Switched to mouse tracking',
            'calibration.skipped.sub': 'Calibration was skipped. Switched back to mouse mode.',

            'prompt.stillThere.title': 'Still there?',
            'prompt.stillThere.sub': "It looks like you stepped away. Come back when you're ready.",
            'prompt.reminder1.text': "Come back when you're ready.",
            'prompt.reminder1.sub': 'Your reading is waiting.',
            'prompt.reminder2.text': 'One sentence at a time.',
            'prompt.reminder2.sub': 'No need to catch up all at once.',
            'prompt.reminder3.text': "It's okay to take breaks.",
            'prompt.reminder3.sub': 'Just come back when you can.',
            'prompt.reminder4.text': 'You were making great progress.',
            'prompt.reminder4.sub': 'Pick up where you left off.',
            'prompt.wakeup.title': 'Time to refocus!',
            'prompt.wakeup.sub': "You've been away for a while. Pick up where you left off.",
            'prompt.struggling.title': 'Take your time with this section.',
            'prompt.struggling.sub': 'No rush — understanding matters more than speed.',

            'api.error.title': '{api} needs attention',
            'api.error.sub': '{summary}. Check camera permission and retry.',

            'debug.paragraph.title': 'Paragraph Boundaries',
            'debug.paragraph.toggleTitle': 'Show or hide paragraph split boundaries',
            'debug.paragraph.track': 'Tracked paragraph (gaze/NLP)',
            'debug.paragraph.heading': 'Section heading (not tracked)',
            'debug.paragraph.titleBlock': 'Title / subtitle (not tracked)',
            'debug.paragraph.stats': '{total} blocks · {tracked} tracked · {headings} headings · {titles} title blocks',
            'debug.paragraph.badgeTrack': 'P{index} · {chars}c · {words}w',
            'debug.paragraph.badgeHeading': 'H · {chars}c',
            'debug.paragraph.typeTitle': 'TITLE',
            'debug.paragraph.typeSubtitle': 'SUBTITLE',

            'insight.break': 'Your attention seems to be drifting. How about taking a short break?',
            'insight.paceSlow': "You're re-reading some sections. Slowing down a bit might help comprehension.",
            'insight.encourage': "Great focus! You're reading consistently well.",
            'insight.paceInfo': "You're reading at a leisurely pace. That's perfectly fine for comprehension!",
            'insight.paceFast': "You're reading quite fast. Make sure you're absorbing the material!",
            'insight.idle': 'Keep reading — personalized feedback will appear here.',

            'import.none': 'No readable text found. Please import .txt, .md, .docx, or similar formats.',
            'import.success': 'Imported {count} files ({size} KB)',
            'import.failed': '{count} files could not be parsed: {files}',

            'strategy.none': 'No intervention',
            'strategy.noneDesc': 'Waiting for state changes',
            'strategy.waiting': 'Waiting for state changes...',
            'strategy.focus.name': 'Focus',
            'strategy.focus.desc': 'Clear overlays, normal paragraph tracking',
            'strategy.subtle_overlay.name': 'Subtle Focus Overlay',
            'strategy.subtle_overlay.desc': 'Semi-transparent overlay to guide attention back',
            'strategy.floating_prompt.name': 'Floating Prompt',
            'strategy.floating_prompt.desc': 'Floating message asking to refocus',
            'strategy.sound_alert.name': 'Sound Alert',
            'strategy.sound_alert.desc': 'Soft chime to draw attention back',
            'strategy.keyword_highlight.name': 'Keyword Highlight',
            'strategy.keyword_highlight.desc': 'Highlight key terms in the content',
            'strategy.summary_panel.name': 'Summary Panel',
            'strategy.summary_panel.desc': 'Show a brief summary of current section',
            'strategy.simplification.name': 'Content Simplification',
            'strategy.simplification.desc': 'Display simplified version of complex content',
            'strategy.progress_indicator.name': 'Progress Indicator',
            'strategy.progress_indicator.desc': 'Show reading progress to encourage continuation',
            'strategy.positive_feedback.name': 'Positive Feedback',
            'strategy.positive_feedback.desc': 'Display encouraging message for returning focus',

            'intervention.floating_prompt.title': 'Still there?',
            'intervention.floating_prompt.sub': 'It looks like you stepped away. Come back when you\'re ready.',
            'intervention.sound_alert.title': 'Time to refocus!',
            'intervention.sound_alert.sub': 'You\'ve been away for a while. Pick up where you left off.',
            'intervention.progress_indicator.title': 'Great progress!',
            'intervention.progress_indicator.sub': 'You\'ve read {percent}% of this document.',
            'intervention.positive_feedback.title': 'Welcome back!',
            'intervention.positive_feedback.sub': 'You\'re back on track. Keep going!',

            'escalation.low': 'low',
            'escalation.medium': 'medium',
            'escalation.high': 'high'
        },
        zh: {
            'app.title': 'FocusFlow — 自适应注意力管理系统',
            'app.tagline': '自适应注意力阅读系统',
            'lang.en': 'EN',
            'lang.zh': '中文',
            'lang.current': '中文',

            'btn.import': '导入文件',
            'btn.reset': '重置',
            'reset.done': '已重置',
            'reset.hint': '认知状态与干预效果已清除',
            'btn.theme.dark': '深色',
            'btn.theme.light': '浅色',
            'btn.clear': '清空',
            'btn.cancel': '取消',
            'btn.enableCamera': '启用摄像头',
            'btn.startCamera': '启动摄像头',
            'btn.paragraphDebug': '¶ 分段调试',
            'btn.paragraphDebugOn': '¶ 分段调试 ON',
            'btn.sessionReport': '阅读报告',

            'comprehension.title': '📋 段落理解辅助',
            'comprehension.meta': '第 {index} 段',
            'comprehension.hint': '',
            'comprehension.loading': '正在用 AI 生成理解辅助…',
            'comprehension.generate': '生成概述',
            'comprehension.reopen': '再次查看',
            'comprehension.translateAi': 'AI翻译',
            'comprehension.translating': '翻译中…',
            'comprehension.translated': '已翻译',
            'comprehension.hideTranslation': '隐藏译文',
            'comprehension.showTranslation': '显示译文',

            'report.title': '阅读会话报告',
            'report.duration': '阅读时长',
            'report.attention': '注意力',
            'report.distractions': '分心次数',
            'report.recovery': '平均恢复',
            'report.heatmapTitle': '段落注意力热力图',
            'report.heatmapHint': '柱长 = 在各段落停留的时间。',
            'report.timelineTitle': '认知状态时间占比',
            'report.timelineHint': '各认知状态所占阅读时长比例。',
            'report.assistTitle': '理解辅助',
            'report.assistCount': '已显示摘要卡片：{count} 次',
            'report.paragraphLabel': '第{index}段',
            'report.noData': '数据尚不足，请继续阅读一段时间。',
            'report.export': '导出 JSON',
            'report.close': '关闭',

            'reading.area': '阅读区',
            'reading.loading': '正在加载阅读内容...',
            'reading.translateAll': '全文 AI 翻译',
            'reading.translateAllProgress': '正在翻译 {current}/{total}…',
            'reading.translateDone': '翻译完成',
            'reading.translateError': '翻译失败',
            'reading.hideAllTranslations': '隐藏全部译文',
            'reading.showAllTranslations': '显示全部译文',
            'reading.keywords': '段落关键词',
            'reading.keyTerms': '关键术语',
            'reading.phrase': '短语',

            'timer.title': '阅读计时器',
            'timer.start': '开始 / 暂停',
            'timer.mode': '切换正计时 / 倒计时',
            'timer.modeUpTitle': '正计时模式 — 点击切换为倒计时',
            'timer.modeDownTitle': '倒计时 {min} 分钟 — 点击切换为正计时',
            'timer.presetHint': '倒计时 {min} 分钟 — 点击切换时长',
            'timer.countUpHint': '已阅读时长',
            'timer.reset': '重置',
            'timer.timeUp.title': '时间到！',
            'timer.timeUp.sub': '本次阅读已结束，休息一下再继续吧。',

            'gaze.toggle': '显示 / 隐藏屏幕上的视线位置指示',

            'camera.title': '眼动追踪',
            'camera.kicker': 'WebGazer 人脸网格预览',
            'camera.waiting': '等待授权',
            'camera.notConnected': '未连接',
            'camera.previewBadge': '4:3 预览',
            'camera.emptyTitle': '摄像头预览',
            'camera.emptySub': '在顶部模式栏切换到「眼动」后，此处将显示 WebGazer 人脸网格。',
            'camera.inputSource': '输入源',
            'camera.trackingStatus': '追踪状态',
            'camera.visualFeedback': '视觉反馈',
            'camera.cursorMeaning': '光标含义',
            'camera.greenMesh': '绿色网格',
            'camera.realGaze': '真实眼动',
            'camera.gate.title': '启用眼动追踪',
            'camera.gate.prompt': 'FocusFlow 需要摄像头权限以进行 WebGazer 眼动追踪。点击下方按钮，浏览器会弹出授权请求。',
            'camera.gate.denied': '摄像头权限已被阻止。请在浏览器设置中允许摄像头，然后点击重试。',
            'camera.gate.file': '请通过本地服务器打开页面，不要直接用 file://。运行 npm start 后访问 http://127.0.0.1:8080。',
            'camera.gate.unsupported': '当前浏览器不支持摄像头 API，请使用 Chrome、Edge 或 Firefox。',
            'camera.gate.enable': '启用摄像头并校准',
            'camera.gate.retry': '重试摄像头',
            'camera.gate.working': '正在启动摄像头...',
            'camera.suggest.allowAddressBar': '点击地址栏的锁或摄像头图标，允许摄像头访问',
            'camera.suggest.resetPermission': '如果之前拒绝过权限，请在浏览器网站设置中重置摄像头权限',
            'camera.suggest.retryButton': '允许权限后，点击「启用摄像头」或「重试摄像头」',
            'camera.suggest.useLocalhost': '请通过 http://127.0.0.1:8080 或 http://localhost:8080 访问（不要用 file://）',
            'camera.suggest.useChromeEdge': '建议使用最新版 Chrome、Edge 或 Firefox 以获得最佳兼容性',
            'camera.suggest.closeOtherApps': '关闭可能占用摄像头的其他应用（如 Zoom、Teams 等）',
            'camera.suggest.connectCamera': '请连接摄像头并确认系统设置中未禁用',

            'state.title': '认知状态',
            'state.cognitive': '认知状态',
            'state.intervention': '干预策略',
            'state.focusedReading': '专注阅读中',
            'state.noIntervention': '无需干预',
            'state.waitingChanges': '等待状态变化...',
            'state.Normal': '专注',
            'state.Distracted': '分心',
            'state.Struggling': '困难',
            'state.Focus': '专注',
            'state.LowDistraction': '低度分心',
            'state.HighDistraction': '高度分心',
            'state.LowStruggling': '低度困难',
            'state.HighStruggling': '高度困难',
            'state.Idle': '中间状态',
            'state.OffScreen': '离屏',
            'state.desc.Normal': '专注阅读中',
            'state.desc.Distracted': '注意力已偏离',
            'state.desc.Struggling': '阅读遇到困难',
            'state.desc.Focus': '专注阅读中',
            'state.desc.LowDistraction': '分心不足 6 秒',
            'state.desc.HighDistraction': '分心超过 6 秒',
            'state.desc.LowStruggling': '困难不足 8 秒',
            'state.desc.HighStruggling': '困难超过 8 秒',
            'state.desc.Idle': '等待状态稳定',
            'state.desc.OffScreen': '已离开屏幕',
            'state.hint.Normal': '指针/视线在阅读区，专注阅读中',
            'state.hint.Distracted': '离开阅读区、人脸消失或长时间未交互',
            'state.hint.Struggling': '停留在段落上 ≥8s 且未滚动',
            'state.hint.Focus': '指针/视线在阅读区，专注阅读中',
            'state.hint.LowDistraction': '分心不足 6 秒，6 秒时弹出提示',
            'state.hint.HighDistraction': '分心超过 6 秒，12 秒时唤醒提醒',
            'state.hint.LowStruggling': '困难不足 8 秒，进入时高亮关键词',
            'state.hint.HighStruggling': '困难超过 8 秒，8 秒时弹出摘要',
            'state.hint.Idle': '其余情况，无操作，等待中',
            'state.hint.Distracted.exit': '视线/鼠标回到阅读区后退出',
            'state.hint.Struggling.exit': '切换段落后退出；离开阅读区一律转入分心',

            'metrics.title': '注意力指标',
            'metrics.attention': '注意力',
            'metrics.speed': '阅读速度',
            'metrics.focusRatio': '专注比',
            'metrics.regression': '回读率',
            'metrics.duration': '时长',
            'metrics.distractions': '分心次数',
            'metrics.wpm': '字/分',
            'metrics.min': '分钟',
            'metrics.perMin': '/分钟',

            'features.title': '感知特征',
            'features.face': '人脸',
            'features.head': '头部',
            'features.gaze': '眼动',
            'features.mouse': '鼠标',
            'features.scroll': '滚动',
            'features.dwell': '停留',
            'features.dispersion': '离散度',
            'features.interaction': '交互',

            'chart.stateProb': '状态概率分布',
            'chart.timeline': '状态时间线',
            'chart.stateShare': '认知状态时间占比',
            'chart.waiting': '等待数据中...',
            'log.title': '事件日志',
            'log.ready': '系统就绪，等待启动...',

            'focus.standard': '标准',
            'focus.deep': '深度专注',
            'focus.standardTitle': '标准模式',
            'focus.deepTitle': '深度专注 — 隐藏侧边栏',

            'tracking.mouse': '鼠标',
            'tracking.gaze': '眼动',
            'tracking.mouseTitle': '鼠标追踪（无需摄像头）',
            'tracking.gazeTitle': '眼动追踪（需开启摄像头）',

            'welcome.title': '欢迎使用 FocusFlow！',
            'welcome.sub': '默认使用鼠标追踪。顶部模式栏可切换专注模式、追踪方式与语言。',

            'calibration.title': 'WebGazer 校准',
            'calibration.instruction': '注视高亮圆点，然后点击或按空格键。',
            'calibration.point': '校准点 {current} / {total}',
            'calibration.waiting': '等待中...',
            'calibration.skip': '跳过校准',
            'calibration.complete.title': '校准完成！',
            'calibration.complete.sub': '眼动追踪已校准，平均误差 {accuracy}px。',
            'calibration.skipped.title': '已切换为鼠标模式',
            'calibration.skipped.sub': '已跳过校准，自动切换回鼠标追踪模式。',

            'prompt.stillThere.title': '还在吗？',
            'prompt.stillThere.sub': '看起来你暂时走开了，准备好了就回来继续阅读吧。',
            'prompt.reminder1.text': '准备好了就回来吧。',
            'prompt.reminder1.sub': '你的阅读内容还在等你。',
            'prompt.reminder2.text': '一次读一句就好。',
            'prompt.reminder2.sub': '不必一次追上所有内容。',
            'prompt.reminder3.text': '休息一下也没关系。',
            'prompt.reminder3.sub': '方便的时候再回来就好。',
            'prompt.reminder4.text': '你刚才读得很好。',
            'prompt.reminder4.sub': '从上次停下的地方继续吧。',
            'prompt.wakeup.title': '该重新专注了！',
            'prompt.wakeup.sub': '你已经离开一段时间了，从上次停下的地方继续吧。',
            'prompt.struggling.title': '这段内容可以慢慢读。',
            'prompt.struggling.sub': '不用着急，理解比速度更重要。',

            'api.error.title': '{api} 需要处理',
            'api.error.sub': '{summary}。请检查摄像头权限后重试。',

            'debug.paragraph.title': '段落边界调试',
            'debug.paragraph.toggleTitle': '显示或隐藏段落划分边界',
            'debug.paragraph.track': '追踪段落（眼动/NLP）',
            'debug.paragraph.heading': '小节标题（不追踪）',
            'debug.paragraph.titleBlock': '标题 / 副标题（不追踪）',
            'debug.paragraph.stats': '共 {total} 块 · {tracked} 个追踪段 · {headings} 个标题 · {titles} 个标题块',
            'debug.paragraph.badgeTrack': '段{index} · {chars}字 · {words}词',
            'debug.paragraph.badgeHeading': '标题 · {chars}字',
            'debug.paragraph.typeTitle': '主标题',
            'debug.paragraph.typeSubtitle': '副标题',

            'insight.break': '注意力似乎有些分散，要不要休息一下？',
            'insight.paceSlow': '你在重复阅读某些段落，放慢一点可能更有助于理解。',
            'insight.encourage': '专注状态很好！你正在稳定地阅读。',
            'insight.paceInfo': '你读得比较从容，这对理解内容很有帮助！',
            'insight.paceFast': '你读得很快，请确保真正吸收了内容！',
            'insight.idle': '继续阅读，个性化阅读建议会显示在这里。',

            'import.none': '未找到可读文本。请导入 .txt、.md、.docx 等格式。',
            'import.success': '已导入 {count} 个文件（{size} KB）',
            'import.failed': '{count} 个文件无法解析：{files}',

            'strategy.none': '无需干预',
            'strategy.noneDesc': '等待状态变化',
            'strategy.waiting': '等待状态变化...',
            'strategy.focus.name': '专心',
            'strategy.focus.desc': '清除遮罩/高亮，正常段落追踪',
            'strategy.subtle_overlay.name': '轻柔聚焦遮罩',
            'strategy.subtle_overlay.desc': '半透明遮罩引导注意力回到正文',
            'strategy.floating_prompt.name': '浮动提示',
            'strategy.floating_prompt.desc': '浮动消息提醒重新专注',
            'strategy.sound_alert.name': '声音提醒',
            'strategy.sound_alert.desc': '轻柔提示音拉回注意力',
            'strategy.keyword_highlight.name': '关键词高亮',
            'strategy.keyword_highlight.desc': '高亮正文中的关键术语',
            'strategy.summary_panel.name': '摘要面板',
            'strategy.summary_panel.desc': '显示当前段落的简要摘要',
            'strategy.simplification.name': '内容简化',
            'strategy.simplification.desc': '展示复杂内容的简化版本',
            'strategy.progress_indicator.name': '进度指示',
            'strategy.progress_indicator.desc': '显示阅读进度以鼓励继续',
            'strategy.positive_feedback.name': '正向反馈',
            'strategy.positive_feedback.desc': '显示鼓励信息，肯定重新专注',

            'intervention.floating_prompt.title': '还在吗？',
            'intervention.floating_prompt.sub': '看起来你暂时走开了，准备好了就回来继续阅读吧。',
            'intervention.sound_alert.title': '该重新专注了！',
            'intervention.sound_alert.sub': '你已经离开一段时间了，从上次停下的地方继续吧。',
            'intervention.progress_indicator.title': '阅读进展不错！',
            'intervention.progress_indicator.sub': '你已完成全文的 {percent}%。',
            'intervention.positive_feedback.title': '欢迎回来！',
            'intervention.positive_feedback.sub': '你已经重新专注，继续保持。',

            'escalation.low': '低',
            'escalation.medium': '中',
            'escalation.high': '高'
        }
    },

    init() {
        const saved = localStorage.getItem('focusflow_lang');
        const browserZh = (navigator.language || '').toLowerCase().startsWith('zh');
        this.setLang(saved || (browserZh ? 'zh' : 'en'), { silent: true });
    },

    t(key, params = {}) {
        const dict = this.translations[this.lang] || this.translations.en;
        let text = dict[key] ?? this.translations.en[key] ?? key;
        for (const [name, value] of Object.entries(params)) {
            text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
        }
        return text;
    },

    setLang(lang, options = {}) {
        if (!this.translations[lang]) return;
        this.lang = lang;
        localStorage.setItem('focusflow_lang', lang);
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
        document.title = this.t('app.title');
        this.applyDocument();
        this.updateLangToggle();
        if (!options.silent) {
            document.dispatchEvent(new CustomEvent('focusflow-lang-change', { detail: { lang } }));
        }
    },

    toggleLang() {
        this.setLang(this.lang === 'zh' ? 'en' : 'zh');
    },

    createLangToggleHTML() {
        return `
            <div class="ff-lang-toggle ff-focus-toggle" id="ff-lang-toggle" role="group" aria-label="Language">
                <button type="button" class="ff-lang-toggle-btn ff-focus-toggle-btn" data-lang="zh">${this.t('lang.zh')}</button>
                <button type="button" class="ff-lang-toggle-btn ff-focus-toggle-btn" data-lang="en">${this.t('lang.en')}</button>
            </div>
        `;
    },

    bindLangToggle() {
        const container = document.getElementById('ff-lang-toggle');
        if (!container) return;

        container.querySelectorAll('[data-lang]').forEach((btn) => {
            btn.onclick = () => this.setLang(btn.dataset.lang);
        });
        this.updateLangToggle();
    },

    updateLangToggle() {
        document.querySelectorAll('.ff-lang-toggle-btn, #ff-lang-toggle .ff-segment-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.lang === this.lang);
        });
    },

    translateState(name) {
        return this.t(`state.${name}`, {}) !== `state.${name}`
            ? this.t(`state.${name}`)
            : name;
    },

    translateStateDesc(name) {
        const key = `state.desc.${name}`;
        return this.t(key) !== key ? this.t(key) : this.t('state.focusedReading');
    },

    translateStateHint(name) {
        const key = `state.hint.${name}`;
        return this.t(key) !== key ? this.t(key) : this.translateStateDesc(name);
    },

    translateStrategy(strategy) {
        if (!strategy || !strategy.id || strategy.id === 'none') {
            return {
                name: this.t('strategy.none'),
                desc: this.t('strategy.noneDesc')
            };
        }
        const nameKey = `strategy.${strategy.id}.name`;
        const descKey = `strategy.${strategy.id}.desc`;
        const name = this.t(nameKey);
        const desc = this.t(descKey);
        return {
            name: name !== nameKey ? name : (strategy.name || this.t('strategy.none')),
            desc: desc !== descKey ? desc : (strategy.description || this.t('strategy.noneDesc'))
        };
    },

    translateEscalation(level) {
        const key = `escalation.${level}`;
        return this.t(key) !== key ? this.t(key) : level;
    },

    applyDocument() {
        this.applyElement(document);
    },

    applyElement(root) {
        if (!root || !root.querySelectorAll) return;

        root.querySelectorAll('[data-i18n]').forEach((el) => {
            el.textContent = this.t(el.getAttribute('data-i18n'));
        });
        root.querySelectorAll('[data-i18n-title]').forEach((el) => {
            el.title = this.t(el.getAttribute('data-i18n-title'));
        });
        root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            el.placeholder = this.t(el.getAttribute('data-i18n-placeholder'));
        });
    }
};

window.setLanguage = function(lang) {
    I18n.setLang(lang);
};

window.toggleLanguage = function() {
    I18n.toggleLang();
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18n;
}
