import React from "react";
import type { LC, LiveElement } from "@use-gpu/live";

import { use, fragment, useState, useMemo, useCallback } from "@use-gpu/live";
import { HTML } from "@use-gpu/react";

const π = Math.PI;

const STYLE = {
  position: "absolute",

  left: 0,
  //left: '50%',
  //marginLeft: '-100px',

  bottom: 0,
  width: "200px",
  padding: "20px",
  background: "rgba(0, 0, 0, .75)",
};

export interface AxisConfig {
  variable: string;
  range: [number, number];
}

interface AppControlsProps {
  container?: Element | null;
  render?: (
    axes: AxisConfig[],
    setAxes: (
      axes: AxisConfig[] | ((oldAxes: AxisConfig[]) => AxisConfig[])
    ) => void,
    graphType: "cartesian" | "polar" | "spherical"
  ) => LiveElement;
}

export const AppControls: LC<AppControlsProps> = (props: AppControlsProps) => {
  const { container, render } = props;

  const [axes, setAxes] = useState<AxisConfig[]>([
    { variable: "x", range: [-3.14, 3.14] },
    { variable: "y", range: [-3.14, 3.14] },
    { variable: "z", range: [-1, 1] },
  ]);

  const updateAxis = useCallback(
    (index: number, newAxis: Partial<AxisConfig>) => {
      setAxes((axes) => [
        ...axes.slice(0, index),
        { ...axes[index], ...newAxis },
        ...axes.slice(index + 1),
      ]);
    },
    []
  );

  const removeAxis = useCallback((index: number) => {
    setAxes((axes) => {
      const newAxes = [...axes.slice(0, index), ...axes.slice(index + 1)];
      return newAxes;
    });
  }, []);

  const addAxis = useCallback((axis: AxisConfig, index?: number) => {
    setAxes((axes) => {
      const newAxes = [...axes];
      newAxes.splice(index ?? axes.length, 0, axis);
      return newAxes;
    });
  }, []);

  const [graphType, setGraphType] = useState<
    "cartesian" | "polar" | "spherical"
  >("cartesian");

  return fragment([
    render ? render(axes, setAxes, graphType) : null,
    use(HTML, {
      container,
      style: STYLE,
      children: (
        <>
          <div>
            Axes:{" "}
            <table>
              <thead>
                <tr>
                  <th>Var</th>
                  <th>Min</th>
                  <th>Max</th>
                </tr>
              </thead>
              <tbody>
                {axes.map((axis, i) => (
                  <tr>
                    <td>
                      <input
                        type="text"
                        style={{
                          textAlign: "center",
                          color: "white",
                          background: "none",
                          border: "none",
                          width: 50,
                        }}
                        value={axis.variable}
                        onChange={(event) => {
                          updateAxis(i, { variable: event.target.value });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        style={{
                          textAlign: "center",
                          color: "white",
                          background: "none",
                          border: "none",
                          width: 50,
                        }}
                        type="number"
                        value={axis.range[0]}
                        onChange={(event) => {
                          updateAxis(i, {
                            range: [Number(event.target.value), axis.range[1]],
                          });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        style={{
                          textAlign: "center",
                          color: "white",
                          background: "none",
                          border: "none",
                          width: 50,
                        }}
                        type="number"
                        value={axis.range[1]}
                        onChange={(event) => {
                          updateAxis(i, {
                            range: [axis.range[0], Number(event.target.value)],
                          });
                        }}
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          removeAxis(i);
                        }}
                        disabled={axes.length === 1}
                      >
                        -
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <select
                value={graphType}
                onChange={(event) => {
                  setGraphType(
                    event.target.value as "cartesian" | "polar" | "spherical"
                  );
                  if (event.target.value === "polar") {
                    setAxes((axes) => [
                      { variable: "θ", range: [-π, π] },
                      {
                        variable: "r",
                        range: [
                          Math.max(0, axes[1].range[0]),
                          axes[1].range[1],
                        ],
                      },
                      ...axes.slice(2),
                    ]);
                  }
                  if (event.target.value === "spherical") {
                    setAxes((axes) => [
                      { variable: "θ", range: [-π, π] },
                      {
                        variable: "φ",
                        range: [-π / 2, π / 2],
                      },
                      {
                        variable: "r",
                        range: [
                          Math.max(0, axes[2].range[0]),
                          axes[2].range[1],
                        ],
                      },
                    ]);
                  }
                }}
              >
                <option value="cartesian">Cartesian</option>
                {axes.length >= 2 && <option value="polar">Polar</option>}
                {axes.length >= 3 && (
                  <option value="spherical">Spherical</option>
                )}
              </select>
              <button
                disabled={axes.length >= 3}
                onClick={() => {
                  addAxis({
                    range: [0, 1],
                    variable: ["x", "y", "z"].find(
                      (v) => !axes.some((a) => a.variable === v)
                    )!,
                  });
                }}
              >
                + Add axis
              </button>
            </div>
          </div>
        </>
      ),
    }),
  ]);
};
