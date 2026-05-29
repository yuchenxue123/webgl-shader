export interface ShaderPreset {
    name: string;
    source: string;
}

export const presets: ShaderPreset[] = [
    {
        name: "Example",
        source: `
uniform float range; // range:0.0,12.0,1.0
uniform vec3 color; // color
void main() {
    gl_FragColor = vec4(color, 1.0);
}
       `
    },
    {
        name: "Gradient",
        source: `void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec3 col = 0.5 + 0.5 * cos(u_time + uv.xyx + vec3(0.0, 2.0, 4.0));
    gl_FragColor = vec4(col, 1.0);
}`,
    },
    {
        name: "Plasma",
        source: `void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 p = uv * 8.0 - 4.0;
    float v = sin(p.x + u_time) + sin(p.y + u_time * 0.7) +
              sin((p.x + p.y) * 0.5 + u_time * 1.3) +
              sin(sqrt(p.x * p.x + p.y * p.y) + u_time);
    vec3 col = vec3(sin(v * 0.8), sin(v * 1.2 + 2.0), sin(v * 1.5 + 4.0));
    col = col * 0.5 + 0.5;
    gl_FragColor = vec4(col, 1.0);
}`,
    },
    {
        name: "Checkerboard",
        source: `void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float size = 16.0;
    vec2 offset = vec2(sin(u_time * 0.5) * 2.0, cos(u_time * 0.3) * 2.0);
    vec2 p = uv * u_resolution / size + offset;
    vec2 c = floor(p);
    float checker = mod(c.x + c.y, 2.0);
    // smooth anti-aliased edges
    vec2 f = smoothstep(0.0, 1.5 / size, fract(p))
           * (1.0 - smoothstep(1.0 - 1.5 / size, 1.0, fract(p)));
    float aa = max(f.x, f.y);
    checker = mix(1.0 - checker, checker, aa);
    vec3 col = vec3(checker * 0.8 + 0.1);
    gl_FragColor = vec4(col, 1.0);
}`,
    },
    {
        name: "Raymarch Sphere",
        source: `float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

float scene(vec3 p) {
    float sphere = sdSphere(p - vec3(0.0, 1.0, 0.0), 1.0);
    float plane = p.y + 1.0;
    return min(sphere, plane);
}

vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        scene(p + e.xyy) - scene(p - e.xyy),
        scene(p + e.yxy) - scene(p - e.yxy),
        scene(p + e.yyx) - scene(p - e.yyx)
    ));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec3 ro = vec3(0.0, 1.5, -5.0);
    float angle = u_time * 0.3;
    ro.xz *= mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec3 rd = normalize(vec3(uv, 1.5));

    float t = 0.0;
    for (int i = 0; i < 80; i++) {
        vec3 p = ro + rd * t;
        float d = scene(p);
        if (d < 0.001) break;
        t += d;
        if (t > 20.0) break;
    }

    vec3 col;
    if (t < 20.0) {
        vec3 p = ro + rd * t;
        vec3 n = getNormal(p);
        vec3 lightDir = normalize(vec3(2.0, 4.0, -1.0));
        float diff = max(dot(n, lightDir), 0.0);
        float spec = pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 32.0);
        col = vec3(0.3, 0.5, 0.9) * diff + vec3(0.6) * spec + vec3(0.05);
    } else {
        col = vec3(0.02, 0.02, 0.05);
    }
    gl_FragColor = vec4(col, 1.0);
}`,
    },
    {
        name: "Frosted Glass",
        source: `// ---------- background content (simulates an app surface) ----------
vec3 bgColor(vec2 uv) {
    // vertical gradient: warm light surface
    vec3 warmLight = vec3(1.0, 0.96, 0.91);
    vec3 warmMid   = vec3(0.96, 0.92, 0.86);
    return mix(warmLight, warmMid, uv.y);
}

float rect(vec2 uv, vec2 pos, vec2 size, float r) {
    vec2 d = abs(uv - pos) - size + r;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

vec3 bgScene(vec2 uv) {
    vec3 col = bgColor(uv);

    // card 1
    float c1 = 1.0 - smoothstep(0.0, 0.003, rect(uv, vec2(0.22, 0.35), vec2(0.16, 0.10), 0.02));
    col = mix(col, vec3(0.98, 0.94, 0.88), c1 * 0.6);

    // card 2
    float c2 = 1.0 - smoothstep(0.0, 0.003, rect(uv, vec2(0.60, 0.28), vec2(0.14, 0.14), 0.02));
    col = mix(col, vec3(0.98, 0.94, 0.88), c2 * 0.6);

    // card 3
    float c3 = 1.0 - smoothstep(0.0, 0.003, rect(uv, vec2(0.45, 0.62), vec2(0.25, 0.08), 0.02));
    col = mix(col, vec3(0.98, 0.94, 0.88), c3 * 0.6);

    // colorful accent blocks inside cards
    float a1 = 1.0 - smoothstep(0.0, 0.002, rect(uv, vec2(0.16, 0.35), vec2(0.03, 0.03), 0.008));
    col = mix(col, vec3(0.4, 0.5, 0.95), a1);

    float a2 = 1.0 - smoothstep(0.0, 0.002, rect(uv, vec2(0.54, 0.28), vec2(0.10, 0.02), 0.004));
    col = mix(col, vec3(0.55, 0.65, 0.95), a2 * 0.7);

    float a3 = 1.0 - smoothstep(0.0, 0.002, rect(uv, vec2(0.38, 0.62), vec2(0.04, 0.02), 0.004));
    col = mix(col, vec3(0.9, 0.4, 0.45), a3);

    // subtle FAB circle
    float fab = 1.0 - smoothstep(0.0, 0.003, length(uv - vec2(0.85, 0.82)) - 0.04);
    col = mix(col, vec3(0.4, 0.5, 0.95), fab);

    return col;
}

uniform float u_blur;         // range:0.05,1.0,0.01
uniform float u_opacity;      // range:0.0,1.0,0.01
uniform float u_tintStrength; // range:0.0,1.0,0.01

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

    // ---------- background blur ----------
    float blurPx = u_blur * 40.0;
    vec3 blurred = vec3(0.0);
    float weightSum = 0.0;
    for (int x = -5; x <= 5; x++) {
        for (int y = -5; y <= 5; y++) {
            vec2 off = vec2(float(x), float(y)) * blurPx / u_resolution;
            float w = exp(-float(x * x + y * y) / 8.0);
            blurred += bgScene(uv + off) * w;
            weightSum += w;
        }
    }
    blurred /= weightSum;

    vec3 sharp = bgScene(uv);

    // ---------- glass panel mask ----------
    vec2 panelUV = uv - 0.5;
    panelUV.x *= aspect;
    float panel = 1.0 - smoothstep(0.0, 0.006,
        rect(panelUV, vec2(0.0), vec2(0.5, 0.28), 0.06));

    // ---------- border ----------
    float borderDist = abs(rect(panelUV, vec2(0.0), vec2(0.5, 0.28), 0.06));
    float border = smoothstep(0.006, 0.0, borderDist) * (1.0 - smoothstep(0.002, 0.0, borderDist));
    border *= 0.15;

    // ---------- compose ----------
    float alpha = u_opacity;
    vec3 tint = vec3(1.0, 0.98, 0.94) * u_tintStrength * 0.12;

    vec3 result = sharp;
    result = mix(result, blurred, panel * alpha);
    result = mix(result, blurred + tint, panel * alpha * 0.3);
    result += vec3(1.0) * border * panel;

    gl_FragColor = vec4(result, 1.0);
}`,
    },
];
