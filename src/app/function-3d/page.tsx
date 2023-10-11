"use client";

import * as React from "react";

import { makeCanvasApp } from "../../../lib/makeCanvasApp";
const Function3DApp = makeCanvasApp(
  import("./Function3DApp").then((m) => m.Function3DApp)
);

import dynamic from "next/dynamic";
import Link from "next/link";
const MathQuillInput = dynamic(
  () =>
    import("../../components/MathQuillInput").then((mod) => mod.MathQuillInput),
  { ssr: false }
);

export default function Index() {
  const [latex, setLatex] = React.useState(String.raw`x * \sin(y)`);
  const [graphType, setGraphType] = React.useState<"cartesian" | "polar">(
    "cartesian"
  );

  return (
    <>
      <Link href="/">← Back</Link>
      <div style={{ position: "relative", width: 640, height: 480 }}>
        <Function3DApp
          latex={latex}
          graphType={graphType}
          width={640}
          height={480}
        />

        <MathQuillInput
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            background: "#fff",
            padding: "5px 10px",
            border: "none",
          }}
          latex={latex}
          onChange={(mathField) => {
            setLatex(mathField.latex());
          }}
        />

        <select
          style={{ position: "absolute", bottom: 10, right: 10 }}
          value={graphType}
          onChange={(event) => {
            setGraphType(
              event.target.value === "cartesian" ? "cartesian" : "polar"
            );
          }}
        >
          <option value="cartesian">Cartesian</option>
          <option value="polar">Polar</option>
        </select>
      </div>
    </>
  );
}
