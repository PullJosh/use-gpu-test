import React, { LiveElement } from "@use-gpu/live";
import { Canvas, DOMEvents, WebGPU } from "@use-gpu/webgpu";
import {
  AmbientLight,
  AxisHelper,
  Cursor,
  CursorProvider,
  LinearRGB,
  Loop,
  OrbitCamera,
  OrbitControls,
  Pass,
  PickingTarget,
} from "@use-gpu/workbench";
import { vec3 } from "gl-matrix";

interface TestAppProps {
  size: number;
}

export function TestApp(
  { size }: TestAppProps,
  canvas: HTMLCanvasElement
): LiveElement {
  return (
    <WebGPU fallback={undefined}>
      <Canvas canvas={canvas} samples={4}>
        <PickingTarget>
          <DOMEvents element={canvas}>
            <CursorProvider element={canvas}>
              <LinearRGB>
                <Cursor cursor="move" />
                <Loop>
                  <OrbitControls
                    radius={5}
                    bearing={0.5}
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
                          <AxisHelper size={size} width={3} />
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
