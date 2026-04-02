import {
  Force,
  coerce,
  resolve,
  type Accessor,
  type Accessors,
  type SimNode,
} from "./force";

export interface ZForce
  extends Accessors<ZForce, Accessor<number>, "z" | "strength"> {}

export class ZForce extends Force {
  #z: Accessor<number>;
  #strength: Accessor<number> = 0.1;
  #nodes: SimNode[] = [];
  #strengths: number[] = [];
  #zz: number[] = [];

  constructor(z: Accessor<number> = 0) {
    super();
    this.#z = z;
  }

  initialize(nodes: SimNode[]) {
    this.#nodes = nodes;
    this.#recompute();
  }

  #recompute() {
    if (!this.#nodes.length) return;
    const n = this.#nodes.length;
    this.#strengths = new Array(n);
    this.#zz = new Array(n);
    for (let i = 0; i < n; ++i) {
      this.#zz[i] = resolve(this.#z, this.#nodes[i], i, this.#nodes);
      this.#strengths[i] = isNaN(this.#zz[i])
        ? 0
        : resolve(this.#strength, this.#nodes[i], i, this.#nodes);
    }
  }

  apply(alpha: number) {
    for (let i = 0, n = this.#nodes.length; i < n; ++i) {
      const node = this.#nodes[i];
      node.vz += (this.#zz[i] - node.z) * this.#strengths[i] * alpha;
    }
  }

  z(value?: Accessor<number>): any {
    return this.accessor(this.#z, value, (v) => {
      this.#z = coerce(v);
      this.#recompute();
    });
  }
  strength(value?: Accessor<number>): any {
    return this.accessor(this.#strength, value, (v) => {
      this.#strength = coerce(v);
      this.#recompute();
    });
  }
}

export default function forceZ(z: Accessor<number> = 0) {
  return new ZForce(z);
}
