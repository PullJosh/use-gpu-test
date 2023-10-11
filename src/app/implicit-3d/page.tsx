"use client";

import * as React from "react";

import { makeCanvasApp } from "../../../lib/makeCanvasApp";
const Implicit3DApp = makeCanvasApp(
  import("./Implicit3DApp").then((m) => m.Implicit3DApp)
);

import dynamic from "next/dynamic";
import Link from "next/link";
const MathQuillInput = dynamic(
  () =>
    import("../../components/MathQuillInput").then((mod) => mod.MathQuillInput),
  { ssr: false }
);

export default function Index() {
  const [latex, setLatex] = React.useState(
    String.raw`\sin\left(6x\right)+\sin\left(6y\right)+\sin\left(6z\right)=2.5\sin t`
  );
  const [graphType, setGraphType] = React.useState<"cartesian" | "polar">(
    "cartesian"
  );

  // const [precision, setPrecision] = React.useState(21);

  return (
    <>
      <Link href="/">← Back</Link>
      <div style={{ position: "relative", width: 640, height: 480 }}>
        <Implicit3DApp
          latex={latex}
          graphType={graphType}
          precision={101}
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

      {/* <label>
        Graphing precision:{" "}
        <input
          type="range"
          min={11}
          max={101}
          step={2}
          value={precision}
          onChange={(event) => {
            setPrecision(Number(event.target.value));
          }}
        />
      </label> */}
    </>
  );
}
