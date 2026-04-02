import {
  Force,
  coerce,
  resolve,
  type Accessor,
  type Accessors,
  type SimNode,
} from "./force";

export interface RadialForce
  extends Accessors<RadialForce, number, "x" | "y" | "z">,
    Accessors<RadialForce, Accessor<number>, "radius" | "strength"> {}

export class RadialForce extends Force {
  #x: number;
  #y: number;
  #z: number;
  #radius: Accessor<number>;
  #strength: Accessor<number> = 0.1;
  #nodes: SimNode[] = [];
  #nDim = 2;
  #strengths: number[] = [];
  #radiuses: number[] = [];

  constructor(radius: Accessor<number>, x = 0, y = 0, z = 0) {
    super();
    this.#radius = radius;
    this.#x = x;
    this.#y = y;
    this.#z = z;
  }

  initialize(nodes: SimNode[], _random: () => number, nDim = 2) {
    this.#nodes = nodes;
    this.#nDim = nDim;
    this.#recompute();
  }

  #recompute() {
    if (!this.#nodes.length) return;
    const n = this.#nodes.length;
    this.#radiuses = new Array(n);
    this.#strengths = new Array(n);
    for (let i = 0; i < n; ++i) {
      this.#radiuses[i] = resolve(this.#radius, this.#nodes[i], i, this.#nodes);
      this.#strengths[i] = isNaN(this.#radiuses[i])
        ? 0
        : resolve(this.#strength, this.#nodes[i], i, this.#nodes);
    }
  }

  apply(alpha: number) {
    for (let i = 0, n = this.#nodes.length; i < n; ++i) {
      const node = this.#nodes[i];
      const dx = node.x - this.#x || 1e-6;
      const dy = (node.y || 0) - this.#y || 1e-6;
      const dz = (node.z || 0) - this.#z || 1e-6;
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const k = ((this.#radiuses[i] - r) * this.#strengths[i] * alpha) / r;
      node.vx += dx * k;
      if (this.#nDim > 1) node.vy += dy * k;
      if (this.#nDim > 2) node.vz += dz * k;
    }
  }

  radius(value?: Accessor<number>): any {
    return this.accessor(this.#radius, value, (v) => {
      this.#radius = coerce(v);
      this.#recompute();
    });
  }
  strength(value?: Accessor<number>): any {
    return this.accessor(this.#strength, value, (v) => {
      this.#strength = coerce(v);
      this.#recompute();
    });
  }
  x(value?: number): any {
    return this.accessor(this.#x, value, (v) => {
      this.#x = +v;
    });
  }
  y(value?: number): any {
    return this.accessor(this.#y, value, (v) => {
      this.#y = +v;
    });
  }
  z(value?: number): any {
    return this.accessor(this.#z, value, (v) => {
      this.#z = +v;
    });
  }
}

export default function forceRadial(
  radius: Accessor<number>,
  x = 0,
  y = 0,
  z = 0,
) {
  return new RadialForce(radius, x, y, z);
}
