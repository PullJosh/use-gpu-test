"use client";

import * as React from "react";

import { makeCanvasApp } from "../../lib/makeCanvasApp";
const TestApp = makeCanvasApp(import("./TestApp").then((m) => m.TestApp));

import dynamic from "next/dynamic";
const MathQuillInput = dynamic(
  () =>
    import("../components/MathQuillInput").then((mod) => mod.MathQuillInput),
  { ssr: false }
);

export default function Index() {
  const [latex, setLatex] = React.useState("-x-y");

  return (
    <div style={{ position: "relative" }}>
      <TestApp latex={latex} width={640} height={480} />

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
    </div>
  );
}
