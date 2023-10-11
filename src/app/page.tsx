import Link from "next/link";

export default function Index() {
  return (
    <div>
      <h1>Use.GPU Graphing Calculator Experiments</h1>
      <ul>
        <li>
          <Link href="/function-3d">
            3D Function Plotter (Cartesian & Polar)
          </Link>
        </li>
        <li>
          <Link href="/implicit-3d">
            3D Implicit Equation Plotter (Cartesian & Polar)
          </Link>
        </li>
      </ul>
    </div>
  );
}
