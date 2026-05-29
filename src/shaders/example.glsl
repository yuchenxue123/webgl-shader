uniform float range; // range:0.0,12.0,1.0
uniform vec3 color; // color
void main() {
    gl_FragColor = vec4(color, 1.0);
}
