"use client";

import { useReducedMotion } from "framer-motion";
import robotIdle from "./robot-idle.json";

 type Keyframe = { t: number; s: number[]; o?: { x: number; y: number }; i?: { x: number; y: number } };
 type Property = { a: number; k: number | number[] | Keyframe[] };
 type Contour = { v: number[][]; i: number[][]; o: number[][]; c: boolean };
 type Shape = { ty: string; ks?: { k: Contour }; c?: { k: number[] }; o?: { k: number }; w?: { k: number }; lc?: number; lj?: number; r?: number; it?: Shape[] };
 type Layer = { ind: number; parent?: number; ks: { a: Property; p: Property; r: Property; o: Property }; shapes: Shape[] };

// Render this asset's static vector contours and animated layer transforms.
const layers = robotIdle.layers as unknown as Layer[];
const phaseDuration = 3;
const duration = phaseDuration * 3;
type Phase = 0 | 1 | 2;
const phaseFor = (layer: Layer): Phase =>
  layer.ind === 5 || layer.ind === 6 ? 0 :
  layer.ind === 3 || layer.ind === 4 || layer.ind === 8 ? 2 : 1;
const first = (property: Property): number[] => property.a
  ? (property.k as Keyframe[])[0].s
  : Array.isArray(property.k) ? property.k as number[] : [property.k as number];
const color = (value?: number[]) => value
  ? `rgb(${value.slice(0, 3).map((channel) => Math.round(channel * 255)).join(" ")})` : "none";

function pathData({ v, i, o, c }: Contour) {
  let path = `M${v[0].join(" ")}`;
  for (let index = 1; index <= (c ? v.length : v.length - 1); index++) {
    const previous = (index - 1) % v.length;
    const next = index % v.length;
    path += ` C${v[previous][0] + o[previous][0]} ${v[previous][1] + o[previous][1]} ${v[next][0] + i[next][0]} ${v[next][1] + i[next][1]} ${v[next].join(" ")}`;
  }
  return path + (c ? " Z" : "");
}

function Timeline({ property, type, anchor, reduced, phase, strength = 1 }: {
  property: Property; type?: "translate" | "rotate"; anchor?: number[]; reduced: boolean; phase: Phase; strength?: number;
}) {
  if (!property.a || reduced) return null;
  // Remap the supplied track into its four-second window. Hold the neutral
  // pose before and after that window so only one movement runs at a time.
  const frames = (property.k as Keyframe[]).map((frame) => ({
    ...frame,
    t: (phase + (frame.t - robotIdle.ip) / (robotIdle.op - robotIdle.ip)) / 3,
  }));
  if (phase > 0) frames.unshift({ ...frames[0], t: 0 });
  if (phase < 2) frames.push({ ...frames[frames.length - 1], t: 1 });
  const initial = frames[0].s;
  const values = frames.map(({ s }) => type === "translate"
    ? `${(s[0] - initial[0]) * strength} ${(s[1] - initial[1]) * strength}`
    : type === "rotate" ? `${initial[0] + (s[0] - initial[0]) * strength} ${anchor![0]} ${anchor![1]}` : `${s[0] / 100}`
  ).join(";");
  const timing = {
    dur: `${duration}s`, repeatCount: "indefinite", values,
    keyTimes: frames.map(({ t }) => t).join(";"),
    calcMode: "spline" as const,
    keySplines: frames.slice(0, -1).map((frame) =>
      `${frame.o?.x ?? 0.33} ${frame.o?.y ?? 0} ${frame.i?.x ?? 0.67} ${frame.i?.y ?? 1}`
    ).join(";"),
  };
  return type ? <animateTransform attributeName="transform" type={type} {...timing} />
    : <animate attributeName="opacity" {...timing} />;
}

function LayerTransform({ layer, reduced, children }: {
  layer: Layer; reduced: boolean; children: React.ReactNode;
}) {
  const anchor = first(layer.ks.a);
  const phase = phaseFor(layer);
  const torso = layer.ind === 1;
  const shoulder = layer.ind === 3 || layer.ind === 4;
  const forearms = layer.ind === 8;
  // The source only lifts armor by 2px and rotates arms by 0.25–0.35°.
  // Amplify those tracks so the idle motion remains visible at mobile sizes.
  const positionStrength = torso ? 4 : shoulder ? 3.5 : forearms ? 3 : 2;
  const rotationStrength = shoulder ? 5 : forearms ? 4 : 1;
  return <g>
    <Timeline property={layer.ks.p} type="translate" reduced={reduced} phase={phase} strength={positionStrength} />
    <g transform={`rotate(${first(layer.ks.r)[0]} ${anchor[0]} ${anchor[1]})`}>
      <Timeline property={layer.ks.r} type="rotate" anchor={anchor} reduced={reduced} phase={phase} strength={rotationStrength} />
      {torso ? (
        <g transform={`translate(${anchor[0]} ${anchor[1]})`}>
          <g>
            {!reduced && <animateTransform attributeName="transform" type="scale"
              values="1 1;1 1;1.025 1.035;1 1;1 1" keyTimes={`0;${1 / 3};0.5;${2 / 3};1`}
              keySplines="0.33 0 0.67 1;0.33 0 0.67 1;0.33 0 0.67 1;0.33 0 0.67 1" calcMode="spline"
              dur={`${duration}s`} repeatCount="indefinite" />}
            <g transform={`translate(${-anchor[0]} ${-anchor[1]})`}>{children}</g>
          </g>
        </g>
      ) : children}
    </g>
  </g>;
}

function RobotLayer({ layer, reduced }: { layer: Layer; reduced: boolean }) {
  const parent = layers.find((candidate) => candidate.ind === layer.parent);
  const artwork = <LayerTransform layer={layer} reduced={reduced}>
    <g opacity={first(layer.ks.o)[0] / 100}>
      <Timeline property={layer.ks.o} reduced={reduced} phase={phaseFor(layer)} />
      {layer.shapes.map((group, index) => {
        const items = group.it ?? [];
        const fill = items.find((shape) => shape.ty === "fl");
        const stroke = items.find((shape) => shape.ty === "st");
        return <g key={index}>
          {items.filter((shape) => shape.ty === "sh").map((shape, pathIndex) => (
            <path key={pathIndex} d={pathData(shape.ks!.k)}
              fill={color(fill?.c?.k)} fillOpacity={(fill?.o?.k ?? 100) / 100}
              fillRule={fill?.r === 2 ? "evenodd" : "nonzero"}
              stroke={color(stroke?.c?.k)} strokeWidth={stroke?.w?.k}
              strokeOpacity={(stroke?.o?.k ?? 100) / 100}
              strokeLinecap={stroke?.lc === 2 ? "round" : "butt"}
              strokeLinejoin={stroke?.lj === 2 ? "round" : "miter"} />
          ))}
        </g>;
      })}
    </g>
  </LayerTransform>;
  // The supplied parented contours use composition coordinates. Inherit only
  // the parent's motion to keep the eyes and chip aligned with their armor.
  return parent ? <LayerTransform layer={parent} reduced={reduced}>{artwork}</LayerTransform> : artwork;
}

export function HeroArt() {
  const reduced = useReducedMotion() ?? false;
  return <div className="hero-art" aria-hidden="true">
    <div className="hex-bg" />
    <svg viewBox="0 0 540 600" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Crop the JSON's top padding to fit the existing character frame. */}
      <g transform="translate(0 -87) scale(0.848)">
        {[...layers].reverse().map((layer) => <RobotLayer key={layer.ind} layer={layer} reduced={reduced} />)}
      </g>
      <path d="M40 570h468v30H40Z" fill="#050505" />
      <path d="M40 570h468" stroke="#EFFF00" strokeOpacity=".4" />
      <g stroke="#EFFF00" strokeOpacity=".6">
        <path d="M30 180v-45h45M510 180v-45h-45M30 480v45h45M510 480v45h-45" />
        <path d="M30 330h25M485 330h25" />
      </g>
    </svg>
    <span className="hero-art-label">NCC CORE / ESCAPE PROTOCOL</span>
  </div>;
}
