import { binarytree } from "d3-binarytree";
import { quadtree } from "d3-quadtree";
import { octree } from "d3-octree";
import jiggle from "./jiggle";
import {
  Force,
  coerce,
  resolve,
  type Accessor,
  type Accessors,
  type SimNode,
} from "./force";

function nodeX(d: SimNode) {
  return d.x + d.vx;
}
function nodeY(d: SimNode) {
  return d.y + d.vy;
}
function nodeZ(d: SimNode) {
  return d.z + d.vz;
}

export interface CollideForce
  extends Accessors<CollideForce, number, "iterations" | "strength">,
    Accessors<CollideForce, Accessor<number>, "radius"> {}

export class CollideForce extends Force {
  #strength = 1;
  #iterations = 1;
  #radius: Accessor<number>;
  #nodes: SimNode[] = [];
  #nDim = 2;
  #radii: number[] = [];
  #random: () => number = Math.random;

  constructor(radius: Accessor<number> = 1) {
    super();
    this.#radius = radius;
  }

  initialize(nodes: SimNode[], random = Math.random, nDim = 2) {
    this.#nodes = nodes;
    this.#random = random;
    this.#nDim = nDim;
    this.#recomputeRadii();
  }

  #recomputeRadii() {
    if (!this.#nodes.length) return;
    const n = this.#nodes.length;
    this.#radii = new Array(n);
    for (let i = 0; i < n; ++i) {
      this.#radii[this.#nodes[i].index] = resolve(
        this.#radius,
        this.#nodes[i],
        i,
        this.#nodes,
      );
    }
  }

  apply() {
    const nodes = this.#nodes;
    const nDim = this.#nDim;
    const radii = this.#radii;
    const random = this.#random;
    const strength = this.#strength;
    const iterations = this.#iterations;
    const n = nodes.length;
    let node: any, ri: number, ri2: number, xi: number, yi: number, zi: number;

    for (let k = 0; k < iterations; ++k) {
      const tree = (
        nDim === 1
          ? binarytree(nodes, nodeX)
          : nDim === 2
            ? quadtree(nodes, nodeX, nodeY)
            : nDim === 3
              ? octree(nodes, nodeX, nodeY, nodeZ)
              : null
      )!.visitAfter(prepare);

      for (let i = 0; i < n; ++i) {
        node = nodes[i];
        ri = radii[node.index];
        ri2 = ri * ri;
        xi = node.x + node.vx;
        if (nDim > 1) yi = node.y + node.vy;
        if (nDim > 2) zi = node.z + node.vz;
        tree.visit(visit);
      }
    }

    function visit(
      treeNode: any,
      arg1: number,
      arg2: number,
      arg3: number,
      arg4: number,
      arg5: number,
      arg6: number,
    ) {
      const x0 = arg1,
        y0 = arg2,
        z0 = arg3,
        x1 = nDim === 1 ? arg2 : arg4,
        y1 = nDim === 1 ? arg3 : arg5,
        z1 = nDim === 1 ? arg4 : arg6;

      const data = treeNode.data,
        rj = treeNode.r,
        r = ri + rj;

      if (data) {
        if (data.index > node.index) {
          let x = xi - data.x - data.vx,
            y = nDim > 1 ? yi - data.y - data.vy : 0,
            z = nDim > 2 ? zi - data.z - data.vz : 0,
            l = x * x + y * y + z * z;

          if (l < r * r) {
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
            l = ((r - (l = Math.sqrt(l))) / l) * strength;

            const rjSq = rj * rj;
            const ratio = rjSq / (ri2 + rjSq);
            x *= l;
            y *= l;
            z *= l;

            node.vx += x * ratio;
            if (nDim > 1) node.vy += y * ratio;
            if (nDim > 2) node.vz += z * ratio;

            const invRatio = 1 - ratio;
            data.vx -= x * invRatio;
            if (nDim > 1) data.vy -= y * invRatio;
            if (nDim > 2) data.vz -= z * invRatio;
          }
        }
        return;
      }
      return (
        x0 > xi + r ||
        x1 < xi - r ||
        (nDim > 1 && (y0 > yi + r || y1 < yi - r)) ||
        (nDim > 2 && (z0 > zi + r || z1 < zi - r))
      );
    }

    function prepare(treeNode: any) {
      if (treeNode.data) return (treeNode.r = radii[treeNode.data.index]);
      for (let i = (treeNode.r = 0); i < 1 << nDim; ++i) {
        if (treeNode[i] && treeNode[i].r > treeNode.r) {
          treeNode.r = treeNode[i].r;
        }
      }
    }
  }

  iterations(value?: number): any {
    return this.accessor(this.#iterations, value, (v) => {
      this.#iterations = +v;
    });
  }
  strength(value?: number): any {
    return this.accessor(this.#strength, value, (v) => {
      this.#strength = +v;
    });
  }
  radius(value?: Accessor<number>): any {
    return this.accessor(this.#radius, value, (v) => {
      this.#radius = coerce(v);
      this.#recomputeRadii();
    });
  }
}

export default function forceCollide(radius: Accessor<number> = 1) {
  return new CollideForce(radius);
}
