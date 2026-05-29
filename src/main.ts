import { ShaderEngine } from "./shader-engine";
import { presets } from "./presets";
import { parseUniforms, defaultUniformValue, type UniformInfo } from "./uniform-parser";

const canvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
const editor = document.getElementById("code-editor") as HTMLTextAreaElement;
const presetSelect = document.getElementById("preset-select") as HTMLSelectElement;
const errorDisplay = document.getElementById("error-display") as HTMLPreElement;
const statusEl = document.getElementById("compile-status") as HTMLSpanElement;
const uniformsPanel = document.getElementById("uniforms-panel") as HTMLDivElement;

// --- Populate preset dropdown ---
for (const p of presets) {
  const opt = document.createElement("option");
  opt.value = p.name;
  opt.textContent = p.name;
  presetSelect.appendChild(opt);
}

// --- Engine ---
const engine = new ShaderEngine(canvas);

// --- Uniform state ---
const uniformValues = new Map<string, number[]>();

function setStatus(ok: boolean): void {
  statusEl.textContent = ok ? "OK" : "ERROR";
  statusEl.className = ok ? "status-ok" : "status-error";
}

function showErrors(errors: { line: number; message: string }[] | null): void {
  if (!errors || errors.length === 0) {
    errorDisplay.textContent = "";
    setStatus(true);
    return;
  }
  setStatus(false);
  errorDisplay.textContent = errors
    .map((e) => `Line ${e.line}: ${e.message}`)
    .join("\n");
}

// --- Uniform UI ---

function makeGroup(info: UniformInfo): HTMLElement {
  if (!uniformValues.has(info.name)) {
    uniformValues.set(info.name, defaultUniformValue(info));
  }
  const vals = uniformValues.get(info.name)!;

  const group = document.createElement("div");
  group.className = "uniform-group";

  const update = (i: number, val: number) => {
    vals[i] = val;
    engine.setUniform(info.name, vals);
  };

  const toHex = (v: number) =>
    Math.round(Math.max(0, Math.min(1, v)) * 255)
      .toString(16)
      .padStart(2, "0");

  // header: name (+ inline color picker) + type badge
  const header = document.createElement("div");
  header.className = "uniform-header";
  const nameEl = document.createElement("span");
  nameEl.className = "uniform-name";
  nameEl.textContent = info.name;

  header.appendChild(nameEl);

  const typeEl = document.createElement("span");
  typeEl.className = "uniform-type";
  typeEl.textContent = info.isColor ? "color" : info.type;
  header.appendChild(typeEl);

  if (info.isColor) {
    const color = document.createElement("input");
    color.type = "color";
    color.style.marginLeft = "auto";
    color.value = "#" + toHex(vals[0]) + toHex(vals[1]) + toHex(vals[2]);
    color.addEventListener("input", () => {
      vals[0] = parseInt(color.value.slice(1, 3), 16) / 255;
      vals[1] = parseInt(color.value.slice(3, 5), 16) / 255;
      vals[2] = parseInt(color.value.slice(5, 7), 16) / 255;
      engine.setUniform(info.name, vals);
    });
    header.appendChild(color);
  }
  group.appendChild(header);

  if (info.type === "float" || info.type === "int") {
    group.appendChild(
      makeSlider(info.name, 0, vals[0], info.range[0], info.range[1], info.step, (v) => update(0, v), "")
    );
  } else if (info.type === "bool") {
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = vals[0] >= 0.5;
    cb.addEventListener("change", () => update(0, cb.checked ? 1 : 0));
    group.appendChild(cb);
  } else if (info.isColor && info.type === "vec4") {
    // vec4 color: alpha slider below the header
    group.appendChild(
      makeSlider(info.name, 3, vals[3], 0, 1, 0.01, (v) => update(3, v), "a")
    );
  } else if (info.isColor) {
    // vec3 color: nothing else needed
  } else {
    // standard vec2/vec3/vec4 — individual component sliders
    const labels = ["x", "y", "z", "w"];
    const len = parseInt(info.type[3], 10); // 2, 3, or 4
    for (let i = 0; i < len; i++) {
      group.appendChild(
        makeSlider(info.name, i, vals[i], info.range[0], info.range[1], info.step, (v) => update(i, v), labels[i])
      );
    }
  }

  return group;
}

function makeSlider(
  _name: string,
  _idx: number,
  value: number,
  min: number,
  max: number,
  step: number,
  onChange: (v: number) => void,
  label: string
): HTMLElement {
  const row = document.createElement("div");
  row.className = "uniform-row";

  if (label) {
    const lbl = document.createElement("label");
    lbl.textContent = label;
    row.appendChild(lbl);
  }

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(value);

  const valSpan = document.createElement("span");
  valSpan.className = "val";
  valSpan.textContent = value.toFixed(step < 0.1 ? 2 : 0);

  slider.addEventListener("input", () => {
    const v = parseFloat(slider.value);
    onChange(v);
    valSpan.textContent = v.toFixed(step < 0.1 ? 2 : 0);
  });

  row.appendChild(slider);
  row.appendChild(valSpan);
  return row;
}

function buildUniformUI(infos: UniformInfo[]): void {
  uniformsPanel.innerHTML = "";
  for (const info of infos) {
    uniformsPanel.appendChild(makeGroup(info));
  }
}

// --- Compile ---

function compileAndRender(): void {
  const source = editor.value;
  const errors = engine.compileShader(source);
  showErrors(errors);

  if (!errors) {
    const infos = parseUniforms(source);
    // remove stale uniforms
    const activeNames = new Set(infos.map((u) => u.name));
    for (const name of uniformValues.keys()) {
      if (!activeNames.has(name)) {
        uniformValues.delete(name);
        engine.removeUniform(name);
      }
    }
    buildUniformUI(infos);
    // re-apply values to the new program
    for (const [name, vals] of uniformValues) {
      engine.setUniform(name, vals);
    }
  }

  try {
    localStorage.setItem("shader-source", source);
  } catch { /* ignore */ }
}

// --- Load source ---
function loadPreset(index: number): void {
  editor.value = presets[index].source;
  compileAndRender();
}

// --- Events ---

presetSelect.addEventListener("change", () => {
  loadPreset(presetSelect.selectedIndex);
});

let debounceTimer = 0;
editor.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(compileAndRender, 400);
});

editor.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    clearTimeout(debounceTimer);
    compileAndRender();
  }
  if (e.key === "Tab") {
    e.preventDefault();
    const start = editor.selectionStart;
    editor.value = editor.value.slice(0, start) + "    " + editor.value.slice(editor.selectionEnd);
    editor.selectionStart = editor.selectionEnd = start + 4;
  }
});

window.addEventListener("resize", () => engine.resize());
const resizeObserver = new ResizeObserver(() => engine.resize());
resizeObserver.observe(canvas);

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  engine.setMouse(
    (e.clientX - rect.left) / rect.width,
    (e.clientY - rect.top) / rect.height
  );
});
canvas.addEventListener("mouseleave", () => engine.setMouse(0, 0));

// --- Init ---
const saved = localStorage.getItem("shader-source");
const presetIdx = presets.findIndex((p) => p.source === saved);
if (presetIdx >= 0) presetSelect.selectedIndex = presetIdx;
editor.value = saved || presets[0].source;
compileAndRender();
engine.start();
