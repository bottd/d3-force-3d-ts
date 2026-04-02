import {
  Force,
  coerce,
  resolve,
  type Accessor,
  type Accessors,
  type SimNode,
} from "./force";

export interface YForce
  extends Accessors<YForce, Accessor<number>, "y" | "strength"> {}

export class YForce extends Force {
  #y: Accessor<number>;
  #strength: Accessor<number> = 0.1;
  #nodes: SimNode[] = [];
  #strengths: number[] = [];
  #yz: number[] = [];

  constructor(y: Accessor<number> = 0) {
    super();
    this.#y = y;
  }

  initialize(nodes: SimNode[]) {
    this.#nodes = nodes;
    this.#recompute();
  }

  #recompute() {
    if (!this.#nodes.length) return;
    const n = this.#nodes.length;
    this.#strengths = new Array(n);
    this.#yz = new Array(n);
    for (let i = 0; i < n; ++i) {
      this.#yz[i] = resolve(this.#y, this.#nodes[i], i, this.#nodes);
      this.#strengths[i] = isNaN(this.#yz[i])
        ? 0
        : resolve(this.#strength, this.#nodes[i], i, this.#nodes);
    }
  }

  apply(alpha: number) {
    for (let i = 0, n = this.#nodes.length; i < n; ++i) {
      const node = this.#nodes[i];
      node.vy += (this.#yz[i] - node.y) * this.#strengths[i] * alpha;
    }
  }

  y(value?: Accessor<number>): any {
    return this.accessor(this.#y, value, (v) => {
      this.#y = coerce(v);
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

export default function forceY(y: Accessor<number> = 0) {
  return new YForce(y);
}
