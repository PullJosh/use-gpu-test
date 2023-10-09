"use client";

import * as React from "react";
import { Live } from "@use-gpu/react";
import type { LiveElement } from "@use-gpu/live";

/**
 * Creates a React component that renders a canvas and a fallback element, and then renders the result of render() into the canvas.
 * @param renderPromise A dynamic import that resolves to a render() function. This function is *almost* like a Live component, but it can't use hooks.
 * @returns A React component that renders a canvas and a fallback element, and then renders the result of render() into the canvas.
 */
export function makeCanvasApp<
  Render extends (
    props: any,
    canvas: HTMLCanvasElement,
    fallback: HTMLElement
  ) => LiveElement
>(renderPromise: Promise<Render>) {
  type AppProps = Parameters<Render>[0];
  type CanvasProps = React.ComponentProps<"canvas">;
  type Props = AppProps & CanvasProps;

  return function CanvasApp(props: Props) {
    const [render, setRender] = React.useState<Render | null>(null);
    const [canvas, setCanvas] = React.useState<HTMLCanvasElement | null>(null);
    const [fallback, setFallback] = React.useState<HTMLElement | null>(null);

    React.useEffect(() => {
      renderPromise.then((m) => setRender(() => m));
    }, []);

    return (
      <div style={{ position: "relative" }}>
        <div
          ref={setFallback}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        />
        <canvas style={{ position: "relative" }} ref={setCanvas} {...props} />
        {render && canvas && fallback && (
          <Live>{render(props, canvas, fallback)}</Live>
        )}
      </div>
    );
  };
}
