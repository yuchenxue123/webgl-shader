void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 p = uv * 8.0 - 4.0;
    float v = sin(p.x + u_time) + sin(p.y + u_time * 0.7) +
              sin((p.x + p.y) * 0.5 + u_time * 1.3) +
              sin(sqrt(p.x * p.x + p.y * p.y) + u_time);
    vec3 col = vec3(sin(v * 0.8), sin(v * 1.2 + 2.0), sin(v * 1.5 + 4.0));
    col = col * 0.5 + 0.5;
    fragColor = vec4(col, 1.0);
}
