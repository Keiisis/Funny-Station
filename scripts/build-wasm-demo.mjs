// Compile un VRAI module WebAssembly de démo (plasma animé) via wabt (WAT -> WASM).
// Usage : node scripts/build-wasm-demo.mjs
// Sortie : public/games/wasm-raytracer/game.wasm
//
// Le module calcule réellement chaque pixel (RGBA) dans sa mémoire linéaire ;
// le runtime (UniversalRuntimeRunner) lit cette mémoire et la peint sur un canvas.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import wabtInit from 'wabt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const WAT = `
(module
  ;; sin importé (param/result f32). Le calcul de l'image reste fait en WASM.
  (import "env" "sinf" (func $sinf (param f32) (result f32)))
  ;; 64 pages * 64KiB = 4 MiB : suffisant pour ~1M pixels RGBA.
  (memory (export "memory") 64)

  (func (export "render") (param $w i32) (param $h i32) (param $t f32)
    (local $x i32) (local $y i32) (local $off i32)
    (local $fx f32) (local $fy f32) (local $v f32)
    (local $wf f32) (local $hf f32)
    (local.set $wf (f32.convert_i32_s (local.get $w)))
    (local.set $hf (f32.convert_i32_s (local.get $h)))
    (local.set $y (i32.const 0))
    (block $yend
      (loop $yloop
        (br_if $yend (i32.ge_s (local.get $y) (local.get $h)))
        (local.set $fy (f32.div (f32.convert_i32_s (local.get $y)) (local.get $hf)))
        (local.set $x (i32.const 0))
        (block $xend
          (loop $xloop
            (br_if $xend (i32.ge_s (local.get $x) (local.get $w)))
            (local.set $fx (f32.div (f32.convert_i32_s (local.get $x)) (local.get $wf)))
            ;; v = sin(fx*10+t) + sin(fy*10+t*0.7) + sin((fx+fy)*8+t)
            (local.set $v
              (f32.add
                (f32.add
                  (call $sinf (f32.add (f32.mul (local.get $fx) (f32.const 10)) (local.get $t)))
                  (call $sinf (f32.add (f32.mul (local.get $fy) (f32.const 10)) (f32.mul (local.get $t) (f32.const 0.7)))))
                (call $sinf (f32.add (f32.mul (f32.add (local.get $fx) (local.get $fy)) (f32.const 8)) (local.get $t)))))
            (local.set $off (i32.mul (i32.add (i32.mul (local.get $y) (local.get $w)) (local.get $x)) (i32.const 4)))
            ;; R, G, B décalés en phase à partir de v -> dégradé arc-en-ciel
            (i32.store8 (local.get $off)
              (i32.trunc_f32_s (f32.add (f32.const 128) (f32.mul (f32.const 110) (call $sinf (local.get $v))))))
            (i32.store8 (i32.add (local.get $off) (i32.const 1))
              (i32.trunc_f32_s (f32.add (f32.const 128) (f32.mul (f32.const 110) (call $sinf (f32.add (local.get $v) (f32.const 2.094)))))))
            (i32.store8 (i32.add (local.get $off) (i32.const 2))
              (i32.trunc_f32_s (f32.add (f32.const 128) (f32.mul (f32.const 110) (call $sinf (f32.add (local.get $v) (f32.const 4.188)))))))
            (i32.store8 (i32.add (local.get $off) (i32.const 3)) (i32.const 255))
            (local.set $x (i32.add (local.get $x) (i32.const 1)))
            (br $xloop)))
        (local.set $y (i32.add (local.get $y) (i32.const 1)))
        (br $yloop))))
)
`;

const wabt = await wabtInit();
const module = wabt.parseWat('game.wat', WAT, { simd: false });
const { buffer } = module.toBinary({});
const out = path.join(__dirname, '..', 'public', 'games', 'wasm-raytracer', 'game.wasm');
fs.writeFileSync(out, Buffer.from(buffer));
console.log(`game.wasm écrit (${buffer.length} octets) -> ${out}`);
module.destroy();
