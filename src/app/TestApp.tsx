import React, { LiveElement, useOne, useMemo, Provide } from "@use-gpu/live";
import {
  Axis,
  Cartesian,
  DataContext,
  Grid,
  Line,
  Plot,
  Surface,
  Transpose,
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
import { getLineSegment } from "@use-gpu/wgsl/geometry/segment.wgsl";
import { sizeToModulus2, unpackIndex2 } from "@use-gpu/wgsl/use/array.wgsl";

import { mathToWGSL } from "../../lib/mathToWGSL";
import { ComputeEngine } from "@cortex-js/compute-engine";
const ce = new ComputeEngine();

interface TestAppProps {
  canvas: HTMLCanvasElement;
  latex: string;
}

export function TestApp({ latex, canvas }: TestAppProps): LiveElement {
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
        t: "time()",
      });
    } catch (err) {
      mathAsWGSL = "0";
    }
    return wgsl`
        @link fn time() -> f32 {}

        @export fn f(pos: vec2<f32>) -> f32 {
          return ${mathAsWGSL};
        }
      `;
  }, [mathJSON]);

  return (
    <WebGPU fallback={undefined}>
      <Canvas canvas={canvas} samples={4}>
        <PickingTarget>
          <DOMEvents element={canvas}>
            <CursorProvider element={canvas}>
              <LinearRGB width={640} height={480}>
                <Cursor cursor="move" />
                <Loop>
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
                            <Cartesian
                              range={[
                                [-1, 1],
                                [-1, 1],
                                [-1, 1],
                              ]}
                            >
                              <Grid
                                axes="xz"
                                width={2}
                                first={{
                                  detail: 1,
                                  divide: 10,
                                  zero: false,
                                  end: true,
                                  nice: true,
                                }}
                                second={{
                                  detail: 1,
                                  divide: 10,
                                  zero: false,
                                  end: true,
                                  nice: true,
                                }}
                                depth={0.5}
                                zBias={-1}
                              />
                              <Axis
                                axis="x"
                                width={4}
                                depth={0.5}
                                color={[1, 0.8, 0.8, 1]}
                              />
                              <Axis
                                axis="y"
                                width={4}
                                depth={0.5}
                                color={[0.8, 1, 0.8, 1]}
                              />
                              <Axis
                                axis="z"
                                width={4}
                                depth={0.5}
                                color={[0.8, 0.8, 1, 1]}
                              />

                              <SampledLambda expr={f} size={[21, 21]}>
                                <Surface color={[0.1, 0.3, 1, 1]} />
                                <Line
                                  width={2}
                                  color={[0.5, 0.5, 1, 0.5]}
                                  depth={0.5}
                                  zBias={1}
                                />
                                <Transpose axes="yx">
                                  <Line
                                    width={2}
                                    color={[0.5, 0.5, 1, 0.5]}
                                    depth={0.5}
                                    zBias={1}
                                  />
                                </Transpose>
                              </SampledLambda>
                            </Cartesian>
                          </Plot>
                        </Pass>
                      </OrbitCamera>
                    )}
                  />
                </Loop>
              </LinearRGB>
            </CursorProvider>
          </DOMEvents>
        </PickingTarget>
      </Canvas>
    </WebGPU>
  );
}

const positionSourceShader = wgsl`
  @link fn f(pos: vec2<f32>) -> f32;

  @link fn size() -> vec2<u32> {}
  @link fn rangeMin() -> vec3<f32> {}
  @link fn rangeMax() -> vec3<f32> {}
  @link fn sizeToModulus2(size: vec2<u32>) -> vec2<u32> {}
  @link fn unpackIndex2(i: u32, modulus: vec2<u32>) -> vec2<u32> {}
  
  @export fn main(index: u32) -> vec4<f32> {
    let index2d = unpackIndex2(index, sizeToModulus2(size()));
    var pos: vec2<f32> = vec2<f32>(index2d) / vec2<f32>(size() - vec2<u32>(1, 1));
    pos = pos * (rangeMax().xz - rangeMin().xz) + rangeMin().xz;
    let y = (f(pos) - rangeMin().y) / (rangeMax().y - rangeMin().y) * 2.0 - 1.0;
    return vec4(pos.x, y, pos.y, 1);
  }
`;

interface SampledLambdaProps {
  expr: ShaderModule;
  size: [number, number];
  children?: LiveElement;
}

function SampledLambda({ expr, size, children }: SampledLambdaProps) {
  const { delta, elapsed, timestamp } = useTimeContext();
  useAnimationFrame();

  const positionSource = useLambdaSource(
    useBoundShader(positionSourceShader, [
      useBoundShader(expr, [elapsed / 1000]),
      size,
      [-1, -1, -1],
      [1, 1, 1],
      sizeToModulus2,
      unpackIndex2,
    ]),
    { size }
  );

  return (
    <Provide context={DataContext} value={positionSource}>
      {children}
    </Provide>
  );
}
