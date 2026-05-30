const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_PREAMBLE = `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
out vec4 fragColor;

`;

const PREAMBLE_LINES = FRAGMENT_PREAMBLE.split("\n").length - 1; // don't count trailing empty string

/** Positions for a full-screen quad (two triangles) in clip space. */
const QUAD_POSITIONS = new Float32Array([
  -1, -1, 1, -1, -1, 1,
  -1, 1, 1, -1, 1, 1,
]);

export interface ShaderError {
  message: string;
  line: number; // 1-based, corrected to user source
}

export class ShaderEngine {
  private gl: WebGL2RenderingContext | WebGLRenderingContext;
  private program: WebGLProgram | null = null;
  private startTime: number;
  private mouseX = 0;
  private mouseY = 0;
  private animFrameId = 0;

  private quadBuf: WebGLBuffer | null = null;
  private posLoc = -1;
  private uTimeLoc: WebGLUniformLocation | null = null;
  private uResLoc: WebGLUniformLocation | null = null;
  private uMouseLoc: WebGLUniformLocation | null = null;

  /** User-defined uniform values: name -> values array */
  private userUniforms = new Map<string, number[]>();
  /** Cached uniform locations for current program */
  private userUniformLocs = new Map<string, WebGLUniformLocation | null>();

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: false });
    if (!gl) throw new Error("WebGL not supported");
    this.gl = gl;

    this.startTime = performance.now();
    this.setupQuad();
    this.resize();
  }

  private setupQuad(): void {
    const gl = this.gl;
    this.quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD_POSITIONS, gl.STATIC_DRAW);
  }

  /** Compile and link a new fragment shader. Returns errors or null on success. */
  compileShader(fragmentSource: string): ShaderError[] | null {
    const gl = this.gl;
    const fullSource = FRAGMENT_PREAMBLE + fragmentSource;

    const vsResult = this.compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    if (!vsResult.shader) {
      throw new Error("Vertex shader compilation failed");
    }
    const vs = vsResult.shader;

    const fsResult = this.compile(gl.FRAGMENT_SHADER, fullSource);
    if (!fsResult.shader) {
      return [this.parseError(fsResult.log)];
    }
    const fs = fsResult.shader;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const infoLog = gl.getProgramInfoLog(prog) || "";
      gl.deleteProgram(prog);
      gl.deleteShader(fs);
      gl.deleteShader(vs);
      return [this.parseError(infoLog)];
    }

    // cleanup old program
    if (this.program) {
      gl.deleteProgram(this.program);
    }

    this.program = prog;
    this.posLoc = gl.getAttribLocation(prog, "a_position");
    this.uTimeLoc = gl.getUniformLocation(prog, "u_time");
    this.uResLoc = gl.getUniformLocation(prog, "u_resolution");
    this.uMouseLoc = gl.getUniformLocation(prog, "u_mouse");

    // refresh user uniform location cache
    this.userUniformLocs.clear();
    for (const name of this.userUniforms.keys()) {
      this.userUniformLocs.set(name, gl.getUniformLocation(prog, name));
    }

    gl.deleteShader(fs);
    gl.deleteShader(vs);
    return null;
  }

  private compile(type: number, source: string): { shader: WebGLShader } | { shader: null; log: string } {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) return { shader: null, log: "Failed to create shader" };
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) || "Unknown compile error";
      gl.deleteShader(shader);
      return { shader: null, log };
    }
    return { shader };
  }

  /** Parse GLSL error log, correcting line numbers for user source. */
  private parseError(log: string): ShaderError {
    // GLSL errors look like: "ERROR: 0:LINE: MESSAGE"
    const match = log.match(/ERROR:\s*\d+:(\d+):\s*(.+)/);
    if (match) {
      const rawLine = parseInt(match[1], 10);
      const correctedLine = rawLine - PREAMBLE_LINES;
      return {
        line: Math.max(1, correctedLine),
        message: match[2].trim(),
      };
    }
    return { line: 0, message: log.trim() };
  }

  setUniform(name: string, values: number[]): void {
    this.userUniforms.set(name, values);
    // cache location if program exists
    if (this.program) {
      const loc = this.gl.getUniformLocation(this.program, name);
      this.userUniformLocs.set(name, loc);
    }
  }

  removeUniform(name: string): void {
    this.userUniforms.delete(name);
    this.userUniformLocs.delete(name);
  }

  setMouse(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  /** Resize the canvas drawing buffer to match CSS size. */
  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth * dpr;
    const h = this.canvas.clientHeight * dpr;
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  private render = (): void => {
    const gl = this.gl;
    this.animFrameId = requestAnimationFrame(this.render);

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    if (!this.program) {
      gl.clearColor(0.1, 0.1, 0.12, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }

    gl.useProgram(this.program);

    const elapsed = (performance.now() - this.startTime) / 1000;

    // u_time
    if (this.uTimeLoc) gl.uniform1f(this.uTimeLoc, elapsed);

    // u_resolution
    if (this.uResLoc) gl.uniform2f(this.uResLoc, this.canvas.width, this.canvas.height);

    // u_mouse (normalized 0-1, origin bottom-left like Shadertoy)
    if (this.uMouseLoc) {
      gl.uniform2f(this.uMouseLoc, this.mouseX * this.canvas.width, (1 - this.mouseY) * this.canvas.height);
    }

    // user-defined uniforms
    for (const [name, values] of this.userUniforms) {
      const loc = this.userUniformLocs.get(name);
      if (!loc) continue;
      switch (values.length) {
        case 1: gl.uniform1f(loc, values[0]); break;
        case 2: gl.uniform2f(loc, values[0], values[1]); break;
        case 3: gl.uniform3f(loc, values[0], values[1], values[2]); break;
        case 4: gl.uniform4f(loc, values[0], values[1], values[2], values[3]); break;
      }
    }

    // bind quad geometry
    if (this.posLoc >= 0) {
      gl.enableVertexAttribArray(this.posLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
      gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, 0, 0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  start(): void {
    if (this.animFrameId) return;
    this.render();
  }

  stop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }
}
