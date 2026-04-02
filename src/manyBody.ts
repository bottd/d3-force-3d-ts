import { binarytree } from "d3-binarytree";
import { quadtree } from "d3-quadtree";
import { octree } from "d3-octree";
import jiggle from "./jiggle";
import { x as simX, y as simY, z as simZ } from "./simulation";
import {
  Force,
  coerce,
  resolve,
  type Accessor,
  type Accessors,
  type SimNode,
} from "./force";

export interface ManyBodyForce
  extends Accessors<
      ManyBodyForce,
      number,
      "distanceMin" | "distanceMax" | "theta"
    >,
    Accessors<ManyBodyForce, Accessor<number>, "strength"> {}

export class ManyBodyForce extends Force {
  #strength: Accessor<number> = -30;
  #distanceMin2 = 1;
  #distanceMax2 = Infinity;
  #theta2 = 0.81;

  #nodes: SimNode[] = [];
  #nDim = 2;
  #random: () => number = Math.random;
  #strengths: number[] = [];

  initialize(nodes: SimNode[], random = Math.random, nDim = 2) {
    this.#nodes = nodes;
    this.#random = random;
    this.#nDim = nDim;
    this.#recompute();
  }

  #recompute() {
    if (!this.#nodes.length) return;
    const n = this.#nodes.length;
    this.#strengths = new Array(n);
    for (let i = 0; i < n; ++i) {
      this.#strengths[this.#nodes[i].index] = resolve(
        this.#strength,
        this.#nodes[i],
        i,
        this.#nodes,
      );
    }
  }

  apply(alpha: number) {
    const nodes = this.#nodes;
    const nDim = this.#nDim;
    const random = this.#random;
    const strengths = this.#strengths;
    const theta2 = this.#theta2;
    const distanceMin2 = this.#distanceMin2;
    const distanceMax2 = this.#distanceMax2;
    const n = nodes.length;

    const tree = (
      nDim === 1
        ? binarytree(nodes, simX)
        : nDim === 2
          ? quadtree(nodes, simX, simY)
          : nDim === 3
            ? octree(nodes, simX, simY, simZ)
            : null
    )!.visitAfter(accumulate);

    let node: any;

    for (let i = 0; i < n; ++i) {
      node = nodes[i];
      tree.visit(applyForce);
    }

    function accumulate(treeNode: any) {
      let strength = 0,
        q,
        c,
        weight = 0,
        x: number,
        y: number,
        z: number,
        i: number;
      const numChildren = treeNode.length;

      if (numChildren) {
        for (x = y = z = i = 0; i < numChildren; ++i) {
          if ((q = treeNode[i]) && (c = Math.abs(q.value))) {
            strength += q.value;
            weight += c;
            x += c * (q.x || 0);
            y += c * (q.y || 0);
            z += c * (q.z || 0);
          }
        }
        strength *= Math.sqrt(4 / numChildren);

        treeNode.x = x / weight;
        if (nDim > 1) treeNode.y = y / weight;
        if (nDim > 2) treeNode.z = z / weight;
      } else {
        q = treeNode;
        q.x = q.data.x;
        if (nDim > 1) q.y = q.data.y;
        if (nDim > 2) q.z = q.data.z;
        do strength += strengths[q.data.index];
        while ((q = q.next));
      }

      treeNode.value = strength;
    }

    function applyForce(
      treeNode: any,
      x1: number,
      arg1: number,
      arg2: number,
      arg3: number,
    ) {
      if (!treeNode.value) return true;
      const x2 = nDim === 1 ? arg1 : nDim === 2 ? arg2 : arg3;

      let x = treeNode.x - node.x,
        y = nDim > 1 ? treeNode.y - node.y : 0,
        z = nDim > 2 ? treeNode.z - node.z : 0;
      const w = x2 - x1;
      let l = x * x + y * y + z * z;

      // Apply the Barnes-Hut approximation if possible.
      if ((w * w) / theta2 < l) {
        if (l < distanceMax2) {
          if (x === 0) {
            x = jiggle(random);
            l += x * x;
          }
          if (nDim > 1 && y === 0) {
            y = jiggle(random);
            l += y * y;
          }
          if (nDim > 2 && z === 0) {
            z = jiggle(random);
            l += z * z;
          }
          if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
          node.vx += (x * treeNode.value * alpha) / l;
          if (nDim > 1) node.vy += (y * treeNode.value * alpha) / l;
          if (nDim > 2) node.vz += (z * treeNode.value * alpha) / l;
        }
        return true;
      }

      // Otherwise, process points directly.
      else if (treeNode.length || l >= distanceMax2) return;

      // Limit forces for very close nodes; randomize direction if coincident.
      if (treeNode.data !== node || treeNode.next) {
        if (x === 0) {
          x = jiggle(random);
          l += x * x;
        }
        if (nDim > 1 && y === 0) {
          y = jiggle(random);
          l += y * y;
        }
        if (nDim > 2 && z === 0) {
          z = jiggle(random);
          l += z * z;
        }
        if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
      }

      do
        if (treeNode.data !== node) {
          const w = (strengths[treeNode.data.index] * alpha) / l;
          node.vx += x * w;
          if (nDim > 1) node.vy += y * w;
          if (nDim > 2) node.vz += z * w;
        }
      while ((treeNode = treeNode.next));
    }
  }

  strength(value?: Accessor<number>): any {
    return this.accessor(this.#strength, value, (v) => {
      this.#strength = coerce(v);
      this.#recompute();
    });
  }
  distanceMin(value?: number): any {
    return this.accessor(Math.sqrt(this.#distanceMin2), value, (v) => {
      this.#distanceMin2 = v * v;
    });
  }
  distanceMax(value?: number): any {
    return this.accessor(Math.sqrt(this.#distanceMax2), value, (v) => {
      this.#distanceMax2 = v * v;
    });
  }
  theta(value?: number): any {
    return this.accessor(Math.sqrt(this.#theta2), value, (v) => {
      this.#theta2 = v * v;
    });
  }
}

export default function forceManyBody() {
  return new ManyBodyForce();
}
