"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Petite simulation SIR qui illustre le modèle GAML affiché à côté :
 * des étudiants se déplacent au hasard (wander), un infecté contamine ses voisins
 * proches avec une certaine probabilité, puis guérit et devient immunisé.
 * Quand l'épidémie s'éteint, la simulation repart de zéro.
 */

const WORLD_W = 600;
const WORLD_H = 320;
const N = 300;
const RADIUS = 9; // distance de contagion, en unités du monde
const P_INFECT = 0.05; // par contact et par cycle
const RECOVERY_MIN = 360; // cycles avant guérison possible
const CELL = RADIUS;

type Counts = { s: number; i: number; r: number; cycle: number };

function createWorld() {
  const x = new Float32Array(N);
  const y = new Float32Array(N);
  const heading = new Float32Array(N);
  const state = new Uint8Array(N); // 0 sain, 1 infecté, 2 guéri
  const since = new Uint16Array(N);
  for (let k = 0; k < N; k++) {
    x[k] = Math.random() * WORLD_W;
    y[k] = Math.random() * WORLD_H;
    heading[k] = Math.random() * Math.PI * 2;
  }
  for (let k = 0; k < 3; k++) state[k] = 1;
  return { x, y, heading, state, since, cycle: 0 };
}

type World = ReturnType<typeof createWorld>;

function step(w: World) {
  const cols = Math.ceil(WORLD_W / CELL);
  const rows = Math.ceil(WORLD_H / CELL);
  const buckets: number[][] = Array.from({ length: cols * rows }, () => []);

  for (let k = 0; k < N; k++) {
    w.heading[k] += (Math.random() - 0.5) * 0.7;
    w.x[k] += Math.cos(w.heading[k]) * 0.7;
    w.y[k] += Math.sin(w.heading[k]) * 0.7;
    if (w.x[k] < 0 || w.x[k] > WORLD_W) {
      w.heading[k] = Math.PI - w.heading[k];
      w.x[k] = Math.min(WORLD_W, Math.max(0, w.x[k]));
    }
    if (w.y[k] < 0 || w.y[k] > WORLD_H) {
      w.heading[k] = -w.heading[k];
      w.y[k] = Math.min(WORLD_H, Math.max(0, w.y[k]));
    }
    const cx = Math.min(cols - 1, Math.floor(w.x[k] / CELL));
    const cy = Math.min(rows - 1, Math.floor(w.y[k] / CELL));
    buckets[cy * cols + cx].push(k);
  }

  for (let k = 0; k < N; k++) {
    if (w.state[k] !== 1) continue;
    w.since[k]++;
    const cx = Math.floor(w.x[k] / CELL);
    const cy = Math.floor(w.y[k] / CELL);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const bx = cx + dx;
        const by = cy + dy;
        if (bx < 0 || by < 0 || bx >= cols || by >= rows) continue;
        for (const j of buckets[by * cols + bx]) {
          if (w.state[j] !== 0) continue;
          const ddx = w.x[j] - w.x[k];
          const ddy = w.y[j] - w.y[k];
          if (ddx * ddx + ddy * ddy < RADIUS * RADIUS && Math.random() < P_INFECT) {
            w.state[j] = 1;
            w.since[j] = 0;
          }
        }
      }
    }
    if (w.since[k] > RECOVERY_MIN && Math.random() < 0.01) w.state[k] = 2;
  }
  w.cycle++;
}

function count(w: World): Counts {
  let s = 0;
  let i = 0;
  let r = 0;
  for (let k = 0; k < N; k++) {
    if (w.state[k] === 0) s++;
    else if (w.state[k] === 1) i++;
    else r++;
  }
  return { s, i, r, cycle: w.cycle };
}

export function LiveSimulation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [counts, setCounts] = useState<Counts>({ s: N - 3, i: 3, r: 0, cycle: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const css = getComputedStyle(canvas);
    const colors = [
      css.getPropertyValue("--sim-s").trim() || "#8fb0ff",
      css.getPropertyValue("--sim-i").trim() || "#b48cff",
      css.getPropertyValue("--sim-r").trim() || "#2fd4df",
    ];
    const gridColor = css.getPropertyValue("--panel-line").trim() || "rgba(255,255,255,0.07)";

    let world = createWorld();
    let frame = 0;
    let raf = 0;
    let visible = true;

    function resize() {
      if (!canvas || !ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(width * (WORLD_H / WORLD_W) * dpr);
      ctx.setTransform((width * dpr) / WORLD_W, 0, 0, (width * dpr) / WORLD_W, 0, 0);
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, WORLD_W, WORLD_H);
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = 30; gx < WORLD_W; gx += 30) {
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, WORLD_H);
      }
      for (let gy = 30; gy < WORLD_H; gy += 30) {
        ctx.moveTo(0, gy);
        ctx.lineTo(WORLD_W, gy);
      }
      ctx.stroke();

      for (let k = 0; k < N; k++) {
        const st = world.state[k];
        if (st === 1) {
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = colors[1];
          ctx.beginPath();
          ctx.arc(world.x[k], world.y[k], RADIUS, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = colors[st];
        ctx.beginPath();
        ctx.arc(world.x[k], world.y[k], st === 1 ? 3.2 : 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(canvas);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      for (let k = 0; k < 420; k++) step(world);
      draw();
      setCounts(count(world));
      return () => ro.disconnect();
    }

    function loop() {
      if (visible) {
        step(world);
        const c = count(world);
        if (c.i === 0 || world.cycle > 3000) world = createWorld();
        draw();
        if (frame++ % 12 === 0) setCounts(c);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden;
    });
    io.observe(canvas);
    const onVisibility = () => {
      visible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <figure className="flex flex-col gap-3">
      <canvas
        ref={canvasRef}
        className="block aspect-[600/320] w-full rounded-xl border border-panel-line bg-panel-deep"
        role="img"
        aria-label={`Simulation d'épidémie sur un campus de ${N} étudiants : ${counts.s} sains, ${counts.i} infectés, ${counts.r} guéris au cycle ${counts.cycle}.`}
      />
      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-panel-muted tabular-nums" aria-hidden="true">
        <Legend color="var(--sim-s)" label="Sains" value={counts.s} />
        <Legend color="var(--sim-i)" label="Infectés" value={counts.i} />
        <Legend color="var(--sim-r)" label="Guéris" value={counts.r} />
        <span className="ml-auto">Cycle {counts.cycle}</span>
      </figcaption>
    </figure>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="size-2 rounded-full" style={{ background: color }} />
      {label} <span className="font-semibold text-panel-ink">{value}</span>
    </span>
  );
}
