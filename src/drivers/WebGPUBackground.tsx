'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export const WebGPUBackground: React.FC = () => {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (pathname && pathname.startsWith('/controller')) {
    return null;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (!gl) {
      console.warn("WebGL non supporté. Utilisation du fond d'écran de secours CSS.");
      return;
    }

    // Shaders sources
    const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;
      uniform vec3 u_bg_color_bottom;
      uniform vec3 u_bg_color_top;
      uniform float u_is_light_theme;

      // Fonction sinus modifiée pour générer des vagues fluides
      float wave(vec2 uv, float speed, float frequency, float amplitude, float shift) {
        float x = uv.x * frequency + u_time * speed + shift;
        return sin(x) * amplitude * (0.5 + 0.5 * cos(uv.x * 2.0));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        
        // Coordonnées centrées
        vec2 centeredUv = uv * 2.0 - 1.0;
        centeredUv.x *= u_resolution.x / u_resolution.y;

        // Interaction avec la souris / manette
        vec2 m = u_mouse / u_resolution.xy;
        vec2 mouseDist = uv - m;
        float mouseInteraction = smoothstep(0.4, 0.0, length(mouseDist)) * 0.12;

        // Génération de vagues empilées (ambiance PS5)
        float wave1 = wave(uv, 1.2, 5.0, 0.08, 0.0) + wave(uv, 0.6, 2.5, 0.05, 1.0);
        float wave2 = wave(uv, 0.9, 7.0, 0.06, 2.3) + wave(uv, 1.4, 3.2, 0.04, 0.5);
        float wave3 = wave(uv, 0.5, 4.0, 0.10, 4.5) + wave(uv, 0.8, 1.8, 0.07, 3.0);

        // Distance par rapport aux vagues
        float d1 = abs(centeredUv.y - wave1 - mouseInteraction);
        float d2 = abs(centeredUv.y - wave2 + mouseInteraction * 0.5);
        float d3 = abs(centeredUv.y - wave3 - mouseInteraction * 0.2);

        // Fond d'écran basé sur le thème
        vec3 bg = mix(u_bg_color_bottom, u_bg_color_top, uv.y);
        
        vec3 finalColor;

        if (u_is_light_theme > 0.5) {
          // Sur fond clair, les oscillations sont bleu sombre/violet/turquoise soustractifs
          vec3 c1_light = vec3(0.0, 0.35, 0.8) * (0.015 / (d1 + 0.02));
          vec3 c2_light = vec3(0.3, 0.0, 0.6) * (0.012 / (d2 + 0.018));
          vec3 c3_light = vec3(0.0, 0.5, 0.6) * (0.010 / (d3 + 0.015));
          finalColor = bg - c1_light * 0.4 - c2_light * 0.3 - c3_light * 0.3;
          finalColor = max(finalColor, vec3(0.15, 0.15, 0.20));
        } else {
          // Sur fond sombre, on ajoute les vagues lumineuses d'origine
          vec3 c1 = vec3(0.0, 0.45, 1.0) * (0.018 / (d1 + 0.02));     // Bleu électrique
          vec3 c2 = vec3(0.4, 0.0, 0.8) * (0.015 / (d2 + 0.018));    // Violet
          vec3 c3 = vec3(0.0, 0.8, 0.9) * (0.012 / (d3 + 0.015));    // Turquoise/Cyan
          finalColor = bg + c1 + c2 + c3;
        }

        // Ajout de particules lumineuses or/blanches scintillantes
        float particleIntensity = 0.0;
        for (int i = 0; i < 8; i++) {
          float fi = float(i);
          // Position pseudo-aléatoire basée sur l'index de la boucle
          vec2 pPos = vec2(
            sin(fi * 415.2 + u_time * (0.1 + fi * 0.02)),
            cos(fi * 953.7 + u_time * (0.08 + fi * 0.015))
          );
          pPos.x *= u_resolution.x / u_resolution.y * 0.8;
          pPos.y *= 0.6;

          float dist = length(centeredUv - pPos);
          float brightness = 0.0015 / (dist + 0.008);
          
          // Scintillement
          brightness *= 0.4 + 0.6 * sin(u_time * 3.0 + fi * 12.0);
          particleIntensity += brightness;
        }

        if (u_is_light_theme > 0.5) {
          finalColor -= vec3(0.15, 0.08, 0.0) * particleIntensity;
          finalColor = max(finalColor, vec3(0.15, 0.15, 0.20));
        } else {
          finalColor += vec3(0.9, 0.95, 1.0) * particleIntensity;
        }

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // Compiler shader helper
    const compileShader = (source: string, type: number): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Erreur de compilation du shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Erreur de link du programme:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Activer les positions
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Trouver les locations des uniforms
    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');
    const uBgColorBottom = gl.getUniformLocation(program, 'u_bg_color_bottom');
    const uBgColorTop = gl.getUniformLocation(program, 'u_bg_color_top');
    const uIsLightTheme = gl.getUniformLocation(program, 'u_is_light_theme');

    // Redimensionnement
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
    };

    window.addEventListener('resize', resize);
    resize();

    // Thèmes de fond WebGL
    const themeColors: Record<string, { bottom: [number, number, number], top: [number, number, number], isLight: boolean }> = {
      noir: { bottom: [0.004, 0.008, 0.024], top: [0.012, 0.024, 0.059], isLight: false },
      blanc: { bottom: [0.90, 0.90, 0.92], top: [0.96, 0.96, 0.98], isLight: true },
      vert: { bottom: [0.002, 0.020, 0.006], top: [0.008, 0.050, 0.018], isLight: false },
      rouge: { bottom: [0.020, 0.002, 0.006], top: [0.050, 0.008, 0.018], isLight: false },
      jaune: { bottom: [0.020, 0.016, 0.002], top: [0.050, 0.040, 0.008], isLight: false },
      bleu: { bottom: [0.001, 0.008, 0.030], top: [0.005, 0.020, 0.070], isLight: false },
    };

    let currentThemeColors = themeColors.noir;

    const applyThemeColors = (themeName: string) => {
      if (themeColors[themeName]) {
        currentThemeColors = themeColors[themeName];
      }
    };

    // Détecter le thème actif au montage
    const htmlThemeClass = Array.from(document.documentElement.classList)
      .find(c => c.startsWith('theme-'))
      ?.replace('theme-', '');
    if (htmlThemeClass) {
      applyThemeColors(htmlThemeClass);
    } else {
      const saved = localStorage.getItem('funny_station_theme');
      if (saved) applyThemeColors(saved);
    }

    const handleThemeChange = (e: any) => {
      applyThemeColors(e.detail.theme);
    };
    window.addEventListener('funny_theme_changed', handleThemeChange as EventListener);

    // Gestion de la souris pour interaction
    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = canvas.height - e.clientY; // Inverser y pour WebGL coord
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Écouter également les touches de manette pour faire bouger le fond
    const handleGamepadMove = (e: CustomEvent<{ direction: string }>) => {
      const dir = e.detail.direction;
      const step = 60;
      if (dir === 'LEFT') targetMouseX = Math.max(0, targetMouseX - step);
      if (dir === 'RIGHT') targetMouseX = Math.min(canvas.width, targetMouseX + step);
      if (dir === 'UP') targetMouseY = Math.min(canvas.height, targetMouseY + step);
      if (dir === 'DOWN') targetMouseY = Math.max(0, targetMouseY - step);
    };

    window.addEventListener('funny_gamepad_action', handleGamepadMove as EventListener);

    // Boucle de rendu
    let animationFrameId: number;
    const start = performance.now();

    const render = () => {
      const time = (performance.now() - start) * 0.001;
      
      // Amortissement de la position souris
      mouseX += (targetMouseX - mouseX) * 0.08;
      mouseY += (targetMouseY - mouseY) * 0.08;

      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mouseX, mouseY);
      
      // Injecter les variables de thèmes
      gl.uniform3f(uBgColorBottom, currentThemeColors.bottom[0], currentThemeColors.bottom[1], currentThemeColors.bottom[2]);
      gl.uniform3f(uBgColorTop, currentThemeColors.top[0], currentThemeColors.top[1], currentThemeColors.top[2]);
      gl.uniform1f(uIsLightTheme, currentThemeColors.isLight ? 1.0 : 0.0);

      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('funny_gamepad_action', handleGamepadMove as EventListener);
      window.removeEventListener('funny_theme_changed', handleThemeChange as EventListener);
      gl.deleteBuffer(positionBuffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-screen h-screen -z-10 bg-zinc-950 pointer-events-none"
      style={{ mixBlendMode: 'normal' }}
    />
  );
};
