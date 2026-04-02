import { Force, type Accessors, type SimNode } from "./force";

export interface CenterForce
  extends Accessors<CenterForce, number, "x" | "y" | "z" | "strength"> {}

export class CenterForce extends Force {
  #x: number;
  #y: number;
  #z: number;
  #strength = 1;
  #nodes: SimNode[] = [];

  constructor(x = 0, y = 0, z = 0) {
    super();
    this.#x = x;
    this.#y = y;
    this.#z = z;
  }

  initialize(nodes: SimNode[]) {
    this.#nodes = nodes;
  }

  apply() {
    const nodes = this.#nodes;
    const strength = this.#strength;
    const n = nodes.length;
    let sx = 0,
      sy = 0,
      sz = 0;

    for (let i = 0; i < n; ++i) {
      const node = nodes[i];
      sx += node.x || 0;
      sy += node.y || 0;
      sz += node.z || 0;
    }

    sx = (sx / n - this.#x) * strength;
    sy = (sy / n - this.#y) * strength;
    sz = (sz / n - this.#z) * strength;

    for (let i = 0; i < n; ++i) {
      const node = nodes[i];
      if (sx) node.x -= sx;
      if (sy) node.y -= sy;
      if (sz) node.z -= sz;
    }
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
  strength(value?: number): any {
    return this.accessor(this.#strength, value, (v) => {
      this.#strength = +v;
    });
  }
}

export default function forceCenter(x = 0, y = 0, z = 0) {
  return new CenterForce(x, y, z);
}
