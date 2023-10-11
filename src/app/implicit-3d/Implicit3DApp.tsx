import React, {
  LiveElement,
  useOne,
  useMemo,
  Provide,
  useState,
  useResource,
} from "@use-gpu/live";
import {
  Axis,
  Cartesian,
  DataContext,
  Grid,
  ImplicitSurface,
  Line,
  Plot,
  Polar,
  Sampled,
  Surface,
  Transpose,
  useRangeContext,
} from "@use-gpu/plot";
import { wgsl } from "@use-gpu/shader/wgsl";
import type { ShaderModule } from "@use-gpu/shader";
import { AutoCanvas, Canvas, DOMEvents, WebGPU } from "@use-gpu/webgpu";
import {
  AmbientLight,
  AxisHelper,
  Cursor,
  CursorProvider,
  LineLayer,
  LinearRGB,
  Loop,
  OrbitCamera,
  OrbitControls,
  Pass,
  PickingTarget,
  SurfaceLayer,
  useAnimationFrame,
  useBoundShader,
  useLambdaSource,
  useTimeContext,
} from "@use-gpu/workbench";
import { vec3 } from "gl-matrix";
import {
  sizeToModulus2,
  sizeToModulus3,
  unpackIndex2,
  unpackIndex3,
} from "@use-gpu/wgsl/use/array.wgsl";
import type { LambdaSource } from "@use-gpu/core";

import { ComputeEngine } from "@cortex-js/compute-engine";
import { mathToWGSL } from "../../../lib/mathToWGSL";
const ce = new ComputeEngine();

(window as any).ce = ce;

interface Implicit3DAppProps {
  canvas: HTMLCanvasElement;
  latex: string;
  graphType: "cartesian" | "polar";
  precision?: number;
}

export function Implicit3DApp({
  latex,
  canvas,
  graphType,
  precision = 21,
}: Implicit3DAppProps): LiveElement {
  const mathJSON = useMemo(() => {
    try {
      return ce.parse(latex);
    } catch (err) {
      return ce.parse("0");
    }
  }, [latex]);

  const f = useOne(() => {
    let mathAsWGSL: string;
    try {
      mathAsWGSL = mathToWGSL(mathJSON.json, {
        x: "pos.x",
        y: "pos.y",
        z: "pos.z",
        t: "time()",
        Equal: (a, b) => `(${a} - ${b})`,
      });
    } catch (err) {
      mathAsWGSL = "0";
    }
    return wgsl`
        @link fn time() -> f32 {}

        @export fn f(pos: vec3<f32>) -> f32 {
          return ${mathAsWGSL};
        }
      `;
  }, [mathJSON]);

  const bend = useSpring(graphType === "polar" ? 1 : 0);

  return (
    <WebGPU fallback={undefined}>
      <Loop>
        <Canvas canvas={canvas} samples={4}>
          <PickingTarget>
            <DOMEvents element={canvas}>
              <CursorProvider element={canvas}>
                <LinearRGB width={640} height={480}>
                  <Cursor cursor="move" />
                  <OrbitControls
                    radius={5}
                    bearing={-0.5}
                    pitch={0.3}
                    render={(
                      radius: number,
                      phi: number,
                      theta: number,
                      target: vec3
                    ) => (
                      <OrbitCamera
                        radius={radius}
                        phi={phi}
                        theta={theta}
                        target={target}
                        scale={1080}
                      >
                        <Pass lights={true}>
                          <AmbientLight intensity={0.2} />
                          {/* <AxisHelper size={1} width={3} /> */}

                          <Plot>
                            <Polar
                              axes="xzy"
                              bend={bend}
                              scale={[2 * Math.PI, 2 * Math.PI, Math.PI]}
                              range={[
                                [-Math.PI, Math.PI],
                                [0, Math.PI],
                                [-Math.PI, Math.PI],
                              ]}
                            >
                              <Grid
                                axes="xy"
                                width={2}
                                first={{
                                  detail: 32,
                                  base: Math.PI,
                                  divide: 10,
                                  zero: false,
                                  end: true,
                                  nice: true,
                                }}
                                second={{
                                  detail: 32,
                                  divide: 10,
                                  zero: false,
                                  end: true,
                                  nice: true,
                                }}
                                depth={0.5}
                                zBias={-1}
                                origin={[0, 1, 0]}
                              />
                              <Axis
                                axis="x"
                                width={4}
                                depth={0.5}
                                color={[1, 0.8, 0.8, 1]}
                                detail={32}
                                // origin={[0, 1, 0]}
                              />
                              <Axis
                                axis="y"
                                width={4}
                                depth={0.5}
                                color={[0.8, 1, 0.8, 1]}
                                detail={32}
                              />
                              <Axis
                                axis="z"
                                width={4}
                                depth={0.5}
                                color={[0.8, 0.8, 1, 1]}
                                detail={32}
                              />
                              <SampledLambdaValuesAndNormals
                                expr={f}
                                size={[precision, precision, precision]}
                              >
                                {(values, normals) => (
                                  <ImplicitSurface
                                    normals={normals}
                                    level={0}
                                    method="linear"
                                    padding={1}
                                    color={[0.8, 0.8, 1.0, 1.0]}
                                  />
                                )}
                              </SampledLambdaValuesAndNormals>
                            </Polar>
                          </Plot>
                        </Pass>
                      </OrbitCamera>
                    )}
                  />
                </LinearRGB>
              </CursorProvider>
            </DOMEvents>
          </PickingTarget>
        </Canvas>
      </Loop>
    </WebGPU>
  );
}

const sourceShader1D = wgsl`
  @link fn f(pos: vec3<f32>) -> f32;

  @link fn size() -> vec3<u32> {}
  @link fn rangeMin() -> vec3<f32> {}
  @link fn rangeMax() -> vec3<f32> {}
  @link fn sizeToModulus3(size: vec2<u32>) -> vec3<u32> {}
  @link fn unpackIndex3(i: u32, modulus: vec2<u32>) -> vec3<u32> {}

  @export fn main(index: u32) -> f32 {
    let index3d = unpackIndex3(index, sizeToModulus3(size()));
    var pos: vec3<f32> = vec3<f32>(index3d) / vec3<f32>(size() - vec3<u32>(1, 1, 1));
    pos = pos * (rangeMax() - rangeMin()) + rangeMin();
    
    return f(pos);
  }
`;

const sourceShader3D = wgsl`
  @link fn df(pos: vec3<f32>) -> vec3<f32>;

  @link fn size() -> vec3<u32> {}
  @link fn rangeMin() -> vec3<f32> {}
  @link fn rangeMax() -> vec3<f32> {}
  @link fn sizeToModulus3(size: vec2<u32>) -> vec3<u32> {}
  @link fn unpackIndex3(i: u32, modulus: vec2<u32>) -> vec3<u32> {}

  @export fn main(index: u32) -> vec3<f32> {
    let index3d = unpackIndex3(index, sizeToModulus3(size()));
    var pos: vec3<f32> = vec3<f32>(index3d) / vec3<f32>(size() - vec3<u32>(1, 1, 1));
    pos = pos * (rangeMax() - rangeMin()) + rangeMin();
    
    return df(pos);
  }
`;

const approximateGradient = wgsl`
  @link fn f(pos: vec3<f32>) -> f32 {}

  @export fn df(pos: vec3<f32>) -> vec3<f32> {
    // Approximate the gradient of f at pos.
    return vec3<f32>(
      f(pos + vec3<f32>(0.0001, 0, 0)) - f(pos - vec3<f32>(0.0001, 0, 0)) / 0.0002,
      f(pos + vec3<f32>(0, 0.0001, 0)) - f(pos - vec3<f32>(0, 0.0001, 0)) / 0.0002,
      f(pos + vec3<f32>(0, 0, 0.0001)) - f(pos - vec3<f32>(0, 0, 0.0001)) / 0.0002
    );
  }
`;

interface SampledLambdaProps {
  expr: ShaderModule;
  size: [number, number, number];
  children?:
    | LiveElement
    | ((values: LambdaSource, normals: LambdaSource) => LiveElement);
}

function SampledLambdaValuesAndNormals({
  expr,
  size,
  children,
}: SampledLambdaProps) {
  const range = useRangeContext();

  const { delta, elapsed, timestamp } = useTimeContext();
  useAnimationFrame();

  const values = useLambdaSource(
    useBoundShader(sourceShader1D, [
      useBoundShader(expr, [elapsed / 1000]),
      size,
      range.map((r) => r[0]),
      range.map((r) => r[1]),
      size.length === 3 ? sizeToModulus3 : sizeToModulus2,
      size.length === 3 ? unpackIndex3 : unpackIndex2,
    ]),
    { size }
  );

  const normals = useLambdaSource(
    useBoundShader(sourceShader3D, [
      useBoundShader(approximateGradient, [
        useBoundShader(expr, [elapsed / 1000]),
      ]),
      size,
      range.map((r) => r[0]),
      range.map((r) => r[1]),
      size.length === 3 ? sizeToModulus3 : sizeToModulus2,
      size.length === 3 ? unpackIndex3 : unpackIndex2,
    ]),
    { size }
  );

  return (
    <Provide context={DataContext} value={values}>
      {typeof children === "function" ? children(values, normals) : children}
    </Provide>
  );
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
