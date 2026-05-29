[English](./README.en.md) | **中文**

---

> 本项目全部由 AI 生成。

# GLSL Shader Playground

基于 TypeScript + WebGL + Vite 的 GLSL Fragment Shader 浏览器端实时编码环境。

## 快速开始

```bash
npm run dev
```

打开 `http://localhost:5173/`，首个预设 shader 即刻渲染。在编辑器中修改代码，400ms 后自动编译刷新。

## 功能

- **实时编译** — 输入后 400ms 自动重新编译，Ctrl+Enter 立即编译
- **内置 Uniform** — 自动注入 `u_time`（时间）、`u_resolution`（分辨率）、`u_mouse`（鼠标坐标）
- **预设库** — Example、Gradient、Plasma、Checkerboard、Raymarch Sphere、Frosted Glass
- **Uniform 自动面板** — 解析源码中的 `uniform` 声明，在右侧边栏生成可视化调节控件
- **错误提示** — 编译失败时显示错误信息，行号已修正为你的源码行号，上一个正常工作的 shader 继续渲染，画面不会空白
- **localStorage** — 编辑器内容自动保存，刷新页面不丢失

## Uniform 注释语法

源码中的自定义 uniform 会自动识别，并在右侧边栏生成交互控件。在 uniform 声明行末尾用 `//` 注释来配置控件行为：

```glsl
uniform float u_blur;         // range:0.05,1.0,0.01   min, max, step
uniform float u_speed;        // range:-5.0,5.0        不写 step 自动使用默认值
uniform vec3  u_color;        // color                  渲染为颜色选择器
uniform vec3  u_position;     // （不加注释）           渲染为 x/y/z 三个滑块
```

| 注释 | 效果 |
|---|---|
| `// range:min,max,step` | 设置滑块范围和步长 |
| `// color` | vec3/vec4 渲染为颜色选择器 |

**不加注释时的默认行为**：
- `float`/`int`：滑块 0–1，步长 0.01
- `vec2`/`vec3`/`vec4`：各分量独立滑块（x, y, z, w）
- `bool`：复选框

## 项目结构

```
shader/
├── index.html              # HTML 骨架
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts             # 入口：DOM 事件、编译调度、uniform UI 生成
    ├── shader-engine.ts    # WebGL2/1 上下文、shader 编译、全屏四边形、渲染循环
    ├── presets.ts          # 预设 shader 列表
    ├── uniform-parser.ts   # 从 GLSL 源码解析 uniform 声明和注释
    └── style.css           # 暗色主题样式
```

## 工作原理

1. **Vertex Shader** 固定 — 一个覆盖整个裁剪空间的全屏四边形
2. **Fragment Shader** 由用户编写，引擎自动在头部注入 `u_time`、`u_resolution`、`u_mouse` 的声明
3. 每帧引擎设置这些 uniform，绘制 6 个顶点（两个三角形）
4. 用户自定义的 uniform 从源码中解析出来，按名称缓存，每帧写入
5. 编译失败时保留上一次正常工作的 program，画面不会变空白

## 构建

```bash
npm run build   # 输出到 dist/
npm run preview # 本地预览生产构建
```
