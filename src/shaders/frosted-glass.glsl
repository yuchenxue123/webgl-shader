// ---------- background content (simulates an app surface) ----------
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
}
