import exampleSource from "./shaders/example.glsl?raw";
import gradientSource from "./shaders/gradient.glsl?raw";
import plasmaSource from "./shaders/plasma.glsl?raw";
import checkerboardSource from "./shaders/checkerboard.glsl?raw";
import raymarchSource from "./shaders/raymarch.glsl?raw";
import frostedGlassSource from "./shaders/frosted-glass.glsl?raw";

export interface ShaderPreset {
  name: string;
  source: string;
}

export const presets: ShaderPreset[] = [
  { name: "Example", source: exampleSource },
  { name: "Gradient", source: gradientSource },
  { name: "Plasma", source: plasmaSource },
  { name: "Checkerboard", source: checkerboardSource },
  { name: "Raymarch Sphere", source: raymarchSource },
  { name: "Frosted Glass", source: frostedGlassSource },
];
