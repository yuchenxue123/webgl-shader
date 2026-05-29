export interface UniformInfo {
  name: string;
  type: "float" | "int" | "bool" | "vec2" | "vec3" | "vec4";
  /** Min/max range. Default [0, 1] for float/int, [0, 1] per component for vectors. */
  range: [number, number];
  /** Step for float/int sliders. Default 0.01. */
  step: number;
  /** True if annotated as a color picker (vec3/vec4 only). */
  isColor: boolean;
}

const BUILTINS = new Set(["u_time", "u_resolution", "u_mouse"]);

/**
 * Parse uniform declarations with optional trailing annotations.
 *
 * Supported annotations (in `//` comment on the same line):
 *   // range:0.0,5.0,0.1   — set min, max, step
 *   // color                — treat vec3/vec4 as a color picker
 */
export function parseUniforms(source: string): UniformInfo[] {
  const regex = /uniform\s+(float|int|bool|vec[234])\s+(\w+)\s*;\s*(?:\/\/\s*(.+))?/g;
  const seen = new Set<string>();
  const results: UniformInfo[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(source)) !== null) {
    const type = match[1] as UniformInfo["type"];
    const name = match[2];
    const annotation = match[3]?.trim() ?? "";

    if (BUILTINS.has(name) || seen.has(name)) continue;
    seen.add(name);

    // defaults
    let range: [number, number] = [0, 1];
    let step = 0.01;
    let isColor = false;

    if (annotation) {
      // parse range
      const rangeMatch = annotation.match(/^range\s*:\s*([\d.+-]+)\s*,\s*([\d.+-]+)\s*(?:,\s*([\d.+-]+))?/);
      if (rangeMatch) {
        range = [parseFloat(rangeMatch[1]), parseFloat(rangeMatch[2])];
        if (rangeMatch[3]) step = parseFloat(rangeMatch[3]);
      }

      // parse color
      if (/\bcolor\b/.test(annotation)) {
        isColor = true;
      }
    }

    results.push({ type, name, range, step, isColor });
  }

  return results;
}

export function defaultUniformValue(info: UniformInfo): number[] {
  const mid = (info.range[0] + info.range[1]) / 2;
  switch (info.type) {
    case "float":
    case "int":
      return [mid];
    case "bool":
      return [0];
    case "vec2":
      return [mid, mid];
    case "vec3":
      return info.isColor ? [0.5, 0.5, 0.5] : [mid, mid, mid];
    case "vec4":
      return info.isColor ? [0.5, 0.5, 0.5, 1] : [mid, mid, mid, mid];
  }
}
