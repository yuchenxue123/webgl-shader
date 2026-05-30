void main() {
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
    fragColor = vec4(col, 1.0);
}
