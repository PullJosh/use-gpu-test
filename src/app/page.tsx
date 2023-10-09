"use client";

import * as React from "react";

import { makeCanvasApp } from "../lib/makeCanvasApp";
const TestApp = makeCanvasApp(import("./TestApp").then((m) => m.TestApp));

export default function Index() {
  const [size, setSize] = React.useState(3);

  return (
    <div>
      <TestApp size={size} width={640} height={480} />
      <input
        type="number"
        value={size}
        onChange={(event) => {
          setSize(event.target.valueAsNumber);
        }}
      />
    </div>
  );
}
