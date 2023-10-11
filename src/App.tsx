import React, {
  Gather,
  LC,
  LiveElement,
  PropsWithChildren,
  hot,
  useContext,
  useFiber,
  useMemo,
  useOne,
  useResource,
  useState,
  useYolo,
} from "@use-gpu/live";
import { wgsl } from "@use-gpu/shader/wgsl";

import { HTML } from "@use-gpu/react";
import { AutoCanvas, WebGPU } from "@use-gpu/webgpu";
import {
  DebugProvider,
  FontLoader,
  Pass,
  LineLayer,
  Data,
  OrbitControls,
  OrbitCamera,
  GeometryData,
  ShaderFlatMaterial,
  LinearRGB,
  Loop,
  Cursor,
  LineSegments,
  PointLayer,
  CompositeData,
  makePlaneGeometry,
  RawTexture,
  ArrayData,
  SurfaceLayer,
  useTransformContext,
  Animate,
  WheelContext,
} from "@use-gpu/workbench";

import type { DataField, StorageSource, DataTexture } from "@use-gpu/core";

import { Scene, Node, Mesh } from "@use-gpu/scene";

import { UseInspect } from "@use-gpu/inspect";
import { inspectGPU } from "@use-gpu/inspect-gpu";
import "@use-gpu/inspect/theme.css";

import { makeFallback } from "./Fallback";
import { vec3 } from "gl-matrix";
import { ShaderSource, TextureSource } from "@use-gpu/shader";
import {
  Axis,
  Axis4,
  Cartesian,
  Grid,
  Label,
  Plot,
  Polar,
  Scale,
  Spherical,
  useRangeContext,
} from "@use-gpu/plot";
import { AppControls, AxisConfig } from "./AppControls";
import { parseVec3 } from "@use-gpu/traits";

const FONTS = [
  {
    family: "Lato",
    weight: "black",
    style: "normal",
    src: "/Lato-Black.ttf",
  },
];

// const planeTextureMaterial = wgsl`
//   @optional @link fn getTexture(uv: vec2<f32>) -> vec4<f32> { return vec4<f32>(0.0); };

//   @export fn main(
//     inColor: vec4<f32>,
//     mapUV: vec4<f32>,
//     mapST: vec4<f32>,
//   ) -> vec4<f32> {
//     return getTexture(mapUV.xy);
//     // return vec4<f32>(mapUV.x, mapUV.y, 0.0, 1.0);
//   }
// `;

const planeMaterial = wgsl`
  @export fn main(
    inColor: vec4<f32>,
    mapUV: vec4<f32>,
    mapST: vec4<f32>,
  ) -> vec4<f32> {
    let uv = mapUV.xy - vec2<f32>(0.5, 0.5);
    let hue = sqrt(uv.x * uv.x + uv.y * uv.y) - 0.5;
    return vec4<f32>(hsv2rgb(hue, 1.0, 1.0), 1.0);
  }

  fn hsv2rgb(h: f32, s: f32, v: f32) -> vec3<f32> {
    let c = vec3<f32>(h, s, v);
    let K = vec4<f32>(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    let p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);
  }
`;

const expr = {
  type: "function_call",
  name: "hsv",
  args: [
    {
      type: "sqrt",
      args: [
        {
          type: "add",
          args: [
            {
              type: "multiply",
              args: [
                { type: "variable", name: "x" },
                { type: "variable", name: "x" },
              ],
            },
            {
              type: "multiply",
              args: [
                { type: "variable", name: "y" },
                { type: "variable", name: "y" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

// const cubeImageUrls = [
//   "/textures/cube/uv/px.png",
//   "/textures/cube/uv/nx.png",
//   "/textures/cube/uv/py.png",
//   "/textures/cube/uv/ny.png",
//   "/textures/cube/uv/pz.png",
//   "/textures/cube/uv/nz.png",
// ];

const lineDataFields = [
  ["array<vec3<f32>>", (o: any) => o.path],
] as DataField[];

type PathPoint = [number, number, number];
type Path = PathPoint[];

function toDetailedPath(path: Path, minLength = 0.1) {
  let newPath: Path = [];

  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];

    newPath.push(
      ...toDetailedSegment(current, next, minLength, i === path.length - 2)
    );
  }

  return newPath;
}

function toDetailedSegment(
  from: PathPoint,
  to: PathPoint,
  minLength = 0.1,
  includeLast = true
) {
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);

  if (dist < minLength) {
    return [from, to];
  }

  const segments = Math.ceil(dist / minLength);
  const points: Path = [];
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    points.push([
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
      from[2] + (to[2] - from[2]) * t,
    ]);
  }

  if (includeLast) {
    points.push(to);
  }

  return points;
}

let lineData = [
  {
    // Body
    path: toDetailedPath([
      [0, 1, 1],
      [2, 7, 1],
      [6, 7, 1],
      [8, 1, 1],
      [6, 1, 1],
      [6, 0, 1],
      [5, 0, 1],
      [5, 1, 1],
      [3, 1, 1],
      [3, 0, 1],
      [2, 0, 1],
      [2, 1, 1],
      [0, 1, 1],
    ]),
  },
  {
    // Mouth
    path: toDetailedPath([
      [2, 2, 1],
      [2, 3, 1],
      [6, 3, 1],
      [6, 2, 1],
      [2, 2, 1],
    ]),
  },
  {
    // Nose
    path: toDetailedPath([
      [3, 4, 1],
      [4, 5, 1],
      [5, 4, 1],
      [3, 4, 1],
    ]),
  },
];

lineData = lineData.map((d) => ({
  path: d.path.map((p) => [p[0] / 5, p[2], p[1] / 5]),
}));

const makeNoiseData = (size: number) => {
  const data = new Uint8Array(size * size * 4);

  let n = size * size;
  for (let i = 0, j = 0; i < n; ++i) {
    data[j++] = Math.random() * 255;
    data[j++] = Math.random() * 255;
    data[j++] = Math.random() * 255;
    data[j++] = 255;
  }

  return {
    data,
    format: "rgba8unorm",
    size: [size, size],
  } as DataTexture;
};

const noiseData = makeNoiseData(1024);

export const App: LC = hot(() => {
  const root = document.querySelector("#use-gpu")!;
  const inner = document.querySelector("#use-gpu .canvas")!;

  // This is for the UseInspect inspector only
  const fiber = useFiber();

  return (
    <UseInspect
      fiber={fiber}
      provider={DebugProvider}
      extensions={[inspectGPU]}
    >
      {/* WebGPU Canvas with a font */}
      <WebGPU
        fallback={(error: Error) => (
          <HTML container={inner}>{makeFallback(error)}</HTML>
        )}
      >
        <AppControls
          render={(axes, setAxes, graphType) => {
            return (
              <AutoCanvas
                selector={"#use-gpu .canvas"}
                samples={4}
                children={
                  <FontLoader
                    fonts={FONTS}
                    children={
                      <Gather
                        children={[
                          // <ImageTexture url={cubeImageUrls[0]} />,
                          <RawTexture data={noiseData} />,
                          // <Gather
                          //   children={[
                          //     <SampledData
                          //       format="vec4<f32>"
                          //       range={[
                          //         [0, 1],
                          //         [0, 1],
                          //       ]}
                          //       size={[30, 30]}
                          //       expr={(emit, x, y) => {
                          //         emit(x, 0, 0, 1); // rgba
                          //       }}
                          //     />,
                          //   ]}
                          //   then={([data]: [StorageSource]) => (
                          //     <RawTexture data={noiseData} />
                          //   )}
                          // />,
                        ]}
                        then={([texture]: [
                          TextureSource
                          // StorageSource
                        ]) => {
                          // const fragment = useBoundShader(
                          //   planeTextureMaterial,
                          //   [texture]
                          // );

                          return (
                            <LinearRGB
                              backgroundColor={[1.0, 0.0, 0.0, 1.0]}
                              tonemap="linear"
                            >
                              <Cursor cursor="move" />
                              <Loop live={true}>
                                {/* 2D pan controls + view */}
                                {/* <OrbitControls
                                  radius={5}
                                  bearing={0.5}
                                  pitch={0.3}
                                  render={(
                                    radius: number,
                                    phi: number,
                                    theta: number,
                                    target: vec3
                                  ) => ( */}

                                {/* @ts-expect-error */}
                                <GraphWindowControls
                                  range={axes.map((axis) => axis.range)}
                                  setRange={(newRange) => {
                                    if (typeof newRange === "function") {
                                      newRange = newRange(
                                        axes.map((axis) => axis.range)
                                      );
                                    }

                                    setAxes((axes) =>
                                      axes.map((axis, i) => ({
                                        ...axis,
                                        range: (newRange as Range)[i],
                                      }))
                                    );
                                  }}
                                  render={(range) => (
                                    <OrbitCamera
                                      // radius={radius}
                                      // phi={phi}
                                      // theta={theta}
                                      // target={target}
                                      radius={5}
                                      phi={Math.PI / 4}
                                      theta={Math.PI / 4}
                                      target={[0, 0, 0]}
                                      scale={1080}
                                    >
                                      {/* Render pass */}
                                      <Pass lights={true}>
                                        {/* <AmbientLight intensity={0.2} /> */}
                                        {/* <AxisHelper size={2} width={3} /> */}

                                        {/* <FullScreen shader={fullscreenShader} /> */}

                                        <Scene>
                                          <Plot>
                                            <CoordinateView
                                              axes={axes}
                                              cyclicAxes={[
                                                "cartesian",
                                                "polar",
                                                "spherical",
                                              ].indexOf(graphType)}
                                            >
                                              <Node
                                              // scale={[0.2, 0.2, 0.2]}
                                              >
                                                <ShaderFlatMaterial
                                                  // fragment={fragment}
                                                  fragment={planeMaterial}
                                                >
                                                  <ArrayData
                                                    format="vec3<f32>"
                                                    size={[21, 21]}
                                                    expr={(emit, i, j) => {
                                                      let minX =
                                                        axes[0].range[0];
                                                      let maxX =
                                                        axes[0].range[1];
                                                      let minY =
                                                        axes[1].range[0];
                                                      let maxY =
                                                        axes[1].range[1];

                                                      const spanX = maxX - minX;
                                                      const spanY = maxY - minY;

                                                      emit(
                                                        (i / 20) * spanX + minX,
                                                        (j / 20) * spanY + minY,
                                                        graphType ===
                                                          "spherical"
                                                          ? (range[2][0] +
                                                              range[2][1]) /
                                                              2
                                                          : 0
                                                      );
                                                    }}
                                                    render={(
                                                      positions: StorageSource
                                                    ) => (
                                                      <SurfaceLayer
                                                        positions={positions}
                                                      />
                                                    )}
                                                  />
                                                </ShaderFlatMaterial>
                                              </Node>

                                              <CompositeData
                                                fields={lineDataFields}
                                                data={lineData}
                                                on={<LineSegments />}
                                                render={(
                                                  positions,
                                                  segments
                                                ) => (
                                                  <LineLayer
                                                    positions={positions}
                                                    segments={segments}
                                                    color={[0.5, 0.5, 1.0, 1]}
                                                    width={5}
                                                    join="round"
                                                    depth={0.9}
                                                  />
                                                )}
                                              />

                                              <Data
                                                fields={[
                                                  [
                                                    "vec3<f32>",
                                                    // prettier-ignore
                                                    [
                                                     2/5, 5/5, 1,
                                                     6/5, 5/5, 1,
                                                  ],
                                                  ],
                                                ]}
                                                render={(positions) => (
                                                  <PointLayer
                                                    positions={positions}
                                                    size={15}
                                                    color={[0.5, 0.5, 1.0, 1]}
                                                    depth={1}
                                                  />
                                                )}
                                              />

                                              <Axis
                                                axis="x"
                                                detail={32}
                                                color="#fff"
                                                size={10}
                                                start={true}
                                                origin={[0, 0, 0]}
                                              />
                                              <Axis
                                                axis="y"
                                                detail={32}
                                                color="#fff"
                                                size={10}
                                                start={true}
                                                origin={[0, 0, 0]}
                                              />
                                              <Axis
                                                axis="z"
                                                detail={32}
                                                color="#fff"
                                                size={10}
                                                start={true}
                                                origin={[0, 0, 0]}
                                              />
                                              <Grid
                                                axes="xy"
                                                width={2}
                                                first={{
                                                  unit: Math.PI,
                                                  base: 2,
                                                  divide: 8,
                                                  end: true,
                                                  zero: true,
                                                  detail: 32,
                                                }}
                                                second={{
                                                  unit: Math.PI,
                                                  base: 2,
                                                  divide: 8,
                                                  end: true,
                                                  zero: true,
                                                  detail: 64,
                                                }}
                                                origin={
                                                  graphType === "spherical"
                                                    ? [
                                                        0,
                                                        0,
                                                        (range[2][0] +
                                                          range[2][1]) /
                                                          2,
                                                      ]
                                                    : [0, 0, 0]
                                                }
                                              />
                                              <Scale
                                                axis="x"
                                                unit={1}
                                                base={2}
                                                divide={8}
                                                end={true}
                                              >
                                                <Label
                                                  size={25}
                                                  color="#f00"
                                                  expand={3}
                                                  depth={0.75}
                                                />
                                                <Label
                                                  size={25}
                                                  color="#fff"
                                                  depth={0.75}
                                                />
                                              </Scale>
                                              <Scale
                                                axis="y"
                                                unit={1}
                                                base={2}
                                                divide={8}
                                                end={true}
                                              >
                                                <Label
                                                  size={25}
                                                  color="#0f0"
                                                  expand={3}
                                                  depth={0.75}
                                                />
                                                <Label
                                                  size={25}
                                                  color="#fff"
                                                  depth={0.75}
                                                />
                                              </Scale>
                                              <Scale
                                                axis="z"
                                                unit={1}
                                                base={2}
                                                divide={8}
                                                end={true}
                                              >
                                                <Label
                                                  size={25}
                                                  color="#00f"
                                                  expand={3}
                                                  depth={0.75}
                                                />
                                                <Label
                                                  size={25}
                                                  color="#fff"
                                                  depth={0.75}
                                                />
                                              </Scale>
                                            </CoordinateView>
                                          </Plot>
                                        </Scene>
                                      </Pass>
                                    </OrbitCamera>
                                  )}
                                />
                                {/* )}
                                /> */}
                              </Loop>
                            </LinearRGB>
                          );
                        }}
                      />
                    }
                  />
                }
              />
            );
          }}
        />
      </WebGPU>
    </UseInspect>
  );
}, module);

App.displayName = "App";

interface CoordinateViewProps {
  axes: AxisConfig[];
  cyclicAxes?: number;
}

function CoordinateView({
  axes,
  cyclicAxes = 0,
  ...props
}: PropsWithChildren<CoordinateViewProps>) {
  const range = axes.map((axis) => axis.range);

  const transform = useTransformContext();

  // By default, x goes left/right, y goes up/down, z goes forward/back
  // Want instead x goes left/right, z goes up/down, y goes forward/back
  const axesStr = "xzy";

  const contents = useMemo(() => {
    switch (axes.length) {
      case 1: {
        return <Cartesian axes={axesStr} range={range} {...props} />;
      }
      case 2: {
        switch (cyclicAxes) {
          case 0: {
            return <Cartesian axes={axesStr} range={range} {...props} />;
          }
          case 1: {
            return <Polar axes={axesStr} range={range} {...props} />;
          }
        }
      }
      case 3: {
        switch (cyclicAxes) {
          case 0: {
            return <Cartesian axes={axesStr} range={range} {...props} />;
          }
          case 1: {
            return <Polar axes={axesStr} range={range} {...props} />;
          }
          case 2: {
            return <Spherical axes={axesStr} range={range} {...props} />;
          }
        }
      }
    }
  }, [axes, cyclicAxes, range, props]);

  const keyframes = useOne(
    () =>
      [
        [0, 0],
        [5, 1],
      ] as [number, number][]
  );

  if (!contents) {
    return null;
  }

  return (
    <Animate
      prop="bend"
      keyframes={keyframes}
      ease="cosine"
      loop={true}
      mirror={true}
      repeat={Infinity}
      pause={1}
    >
      {contents}
    </Animate>
  );

  return null;
}

function useSpring(target: number, rate = 0.05) {
  const [value, setValue] = useState(target);

  useResource(
    (dispose) => {
      let done = false;

      const fn = () => {
        if (done) return;
        requestAnimationFrame(fn);

        setValue((value) => value + (target - value) * rate);
      };

      dispose(() => (done = true));
      requestAnimationFrame(fn);
    },
    [target, rate]
  );

  return value;
}

type Range = [number, number][];

interface GraphWindowControlsProps {
  range: Range;
  setRange: (newRange: Range | ((oldRange: Range) => Range)) => void;
  active?: boolean;
  render: (range: Range) => LiveElement;
}

function GraphWindowControls({
  range,
  setRange,
  active = true,
  render,
}: GraphWindowControlsProps) {
  const { useWheel } = useContext(WheelContext);

  const { wheel } = useWheel();

  useOne(() => {
    const { moveX, moveY, spinY, stop, stopped } = wheel;
    const speedY = 0.5;
    if (!active || stopped) return;

    if (spinY) {
      const magMultiplier = Math.pow(2, spinY * speedY);
      setRange((range: Range) => {
        return range.map(([min, max]) => {
          const span = max - min;
          const center = (max + min) / 2;
          return [
            center - 0.5 * span * magMultiplier,
            center + 0.5 * span * magMultiplier,
          ];
        });
      });
    }

    if (active) stop();
  }, wheel);

  return useYolo(() => render(range), [render, range]);
}
