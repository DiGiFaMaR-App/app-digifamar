import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * FluidHero — a soft, glowing green "fluid" backdrop using a fragment shader.
 * Renders nothing if WebGL is unavailable (SSR/older browsers); ambient CSS
 * orbs on the splash provide a graceful fallback.
 */
export function FluidHero({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Skip if WebGL is not available
    const testCanvas = document.createElement("canvas");
    const gl =
      testCanvas.getContext("webgl2") ||
      testCanvas.getContext("webgl") ||
      testCanvas.getContext("experimental-webgl");
    if (!gl) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);

    const setSize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h, false);
      uniforms.u_resolution.value.set(w, h);
    };

    const uniforms = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(1, 1) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform float u_time;
        uniform vec2 u_resolution;
        uniform vec2 u_mouse;

        // Simplex-ish noise (Ashima)
        vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
        vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
        vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
        float snoise(vec2 v){
          const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                              -0.577350269189626, 0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                  + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                                  dot(x12.zw,x12.zw)), 0.0);
          m = m*m; m = m*m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * snoise(p);
            p *= 2.05;
            a *= 0.55;
          }
          return v;
        }

        void main() {
          vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
          float t = u_time * 0.08;

          // Two domain-warped noise layers => "ink in water" feel
          vec2 q = vec2(fbm(st + t), fbm(st - t + 4.7));
          vec2 r = vec2(
            fbm(st + 1.6 * q + vec2(1.7, 9.2) + 0.15 * t),
            fbm(st + 1.6 * q + vec2(8.3, 2.8) + 0.13 * t)
          );
          float f = fbm(st + 2.0 * r);

          // Distance to "logo glow" focal point
          float d = length(st);
          float core = smoothstep(0.85, 0.05, d);

          // DiGiFaMaR greens
          vec3 deep  = vec3(0.024, 0.055, 0.035);  // near-black green
          vec3 mid   = vec3(0.043, 0.196, 0.118);  // forest
          vec3 leaf  = vec3(0.133, 0.773, 0.369);  // #22C55E
          vec3 glow  = vec3(0.51,  0.97,  0.71);   // bright leaf

          vec3 col = mix(deep, mid, smoothstep(-0.4, 0.6, f));
          col = mix(col, leaf, smoothstep(0.35, 0.95, f) * 0.85);
          col += glow * core * 0.55;

          // Soft volumetric streaks
          float streak = smoothstep(0.55, 1.0, f) * (1.0 - d * 0.8);
          col += leaf * streak * 0.35;

          // Vignette
          col *= smoothstep(1.25, 0.2, d);

          float alpha = clamp(0.55 + 0.45 * smoothstep(-0.2, 0.8, f), 0.0, 1.0);
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    mount.appendChild(renderer.domElement);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    setSize();

    const ro = new ResizeObserver(setSize);
    ro.observe(mount);

    const onMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      uniforms.u_mouse.value.set(
        (e.clientX - rect.left) / rect.width,
        1 - (e.clientY - rect.top) / rect.height,
      );
    };
    window.addEventListener("pointermove", onMove);

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      uniforms.u_time.value += clock.getDelta();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    />
  );
}
