import {
  Force,
  coerce,
  resolve,
  type Accessor,
  type Accessors,
  type SimNode,
} from "./force";

export interface XForce
  extends Accessors<XForce, Accessor<number>, "x" | "strength"> {}

export class XForce extends Force {
  #x: Accessor<number>;
  #strength: Accessor<number> = 0.1;
  #nodes: SimNode[] = [];
  #strengths: number[] = [];
  #xz: number[] = [];

  constructor(x: Accessor<number> = 0) {
    super();
    this.#x = x;
  }

  initialize(nodes: SimNode[]) {
    this.#nodes = nodes;
    this.#recompute();
  }

  #recompute() {
    if (!this.#nodes.length) return;
    const n = this.#nodes.length;
    this.#strengths = new Array(n);
    this.#xz = new Array(n);
    for (let i = 0; i < n; ++i) {
      this.#xz[i] = resolve(this.#x, this.#nodes[i], i, this.#nodes);
      this.#strengths[i] = isNaN(this.#xz[i])
        ? 0
        : resolve(this.#strength, this.#nodes[i], i, this.#nodes);
    }
  }

  apply(alpha: number) {
    for (let i = 0, n = this.#nodes.length; i < n; ++i) {
      const node = this.#nodes[i];
      node.vx += (this.#xz[i] - node.x) * this.#strengths[i] * alpha;
    }
  }

  x(value?: Accessor<number>): any {
    return this.accessor(this.#x, value, (v) => {
      this.#x = coerce(v);
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

export default function forceX(x: Accessor<number> = 0) {
  return new XForce(x);
}
