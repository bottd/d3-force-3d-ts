import jiggle from "./jiggle";
import {
  Force,
  coerce,
  resolve,
  type Accessor,
  type Accessors,
  type SimNode,
} from "./force";

function findNode(nodeById: Map<any, any>, nodeId: any) {
  const node = nodeById.get(nodeId);
  if (!node) throw new Error("node not found: " + nodeId);
  return node;
}

export interface LinkForce
  extends Accessors<LinkForce, number, "iterations">,
    Accessors<LinkForce, Accessor<number>, "strength" | "distance">,
    Accessors<LinkForce, any[], "links">,
    Accessors<LinkForce, (...args: any[]) => any, "id"> {}

export class LinkForce extends Force {
  #iterations = 1;
  #links: any[];
  #id: (...args: any[]) => any = (d) => d.index;
  #strength: Accessor<number> = (link: any) => this.#defaultStrength(link);
  #distance: Accessor<number> = 30;

  #nodes: SimNode[] = [];
  #nDim = 2;
  #random: () => number = Math.random;
  #count: number[] = [];
  #bias: number[] = [];
  #strengths: number[] = [];
  #distances: number[] = [];

  constructor(links: any[] = []) {
    super();
    this.#links = links;
  }

  #defaultStrength(link: any): number {
    return (
      1 /
      Math.min(this.#count[link.source.index], this.#count[link.target.index])
    );
  }

  initialize(nodes: SimNode[], random = Math.random, nDim = 2) {
    this.#nodes = nodes;
    this.#random = random;
    this.#nDim = nDim;
    this.#initializeLinks();
  }

  #initializeLinks() {
    if (!this.#nodes.length) return;
    const nodes = this.#nodes;
    const links = this.#links;
    const id = this.#id;
    const n = nodes.length;
    const m = links.length;
    const nodeById = new Map(nodes.map((d, i) => [id(d, i, nodes), d]));

    this.#count = new Array(n).fill(0);
    for (let i = 0; i < m; ++i) {
      const link = links[i];
      link.index = i;
      if (typeof link.source !== "object")
        link.source = findNode(nodeById, link.source);
      if (typeof link.target !== "object")
        link.target = findNode(nodeById, link.target);
      this.#count[link.source.index] =
        (this.#count[link.source.index] || 0) + 1;
      this.#count[link.target.index] =
        (this.#count[link.target.index] || 0) + 1;
    }

    this.#bias = new Array(m);
    for (let i = 0; i < m; ++i) {
      const link = links[i];
      this.#bias[i] =
        this.#count[link.source.index] /
        (this.#count[link.source.index] + this.#count[link.target.index]);
    }

    this.#strengths = new Array(m);
    this.#recomputeStrength();
    this.#distances = new Array(m);
    this.#recomputeDistance();
  }

  #recomputeStrength() {
    if (!this.#nodes.length) return;
    const links = this.#links;
    for (let i = 0, n = links.length; i < n; ++i) {
      this.#strengths[i] = resolve(this.#strength, links[i], i, links);
    }
  }

  #recomputeDistance() {
    if (!this.#nodes.length) return;
    const links = this.#links;
    for (let i = 0, n = links.length; i < n; ++i) {
      this.#distances[i] = resolve(this.#distance, links[i], i, links);
    }
  }

  apply(alpha: number) {
    const links = this.#links;
    const nDim = this.#nDim;
    const strengths = this.#strengths;
    const distances = this.#distances;
    const bias = this.#bias;
    const random = this.#random;

    for (let k = 0, n = links.length; k < this.#iterations; ++k) {
      for (let i = 0; i < n; ++i) {
        const link = links[i];
        const source = link.source;
        const target = link.target;
        let x = target.x + target.vx - source.x - source.vx || jiggle(random);
        let y = 0;
        if (nDim > 1) {
          y = target.y + target.vy - source.y - source.vy || jiggle(random);
        }
        let z = 0;
        if (nDim > 2) {
          z = target.z + target.vz - source.z - source.vz || jiggle(random);
        }
        let l = Math.sqrt(x * x + y * y + z * z);
        l = ((l - distances[i]) / l) * alpha * strengths[i];
        x *= l;
        y *= l;
        z *= l;

        let b = bias[i];
        target.vx -= x * b;
        if (nDim > 1) target.vy -= y * b;
        if (nDim > 2) target.vz -= z * b;

        b = 1 - b;
        source.vx += x * b;
        if (nDim > 1) source.vy += y * b;
        if (nDim > 2) source.vz += z * b;
      }
    }
  }

  links(value?: any[]): any {
    return this.accessor(this.#links, value, (v) => {
      this.#links = v;
      this.#initializeLinks();
    });
  }
  id(value?: (...args: any[]) => any): any {
    return this.accessor(this.#id, value, (v) => {
      this.#id = v;
    });
  }
  iterations(value?: number): any {
    return this.accessor(this.#iterations, value, (v) => {
      this.#iterations = +v;
    });
  }
  strength(value?: Accessor<number>): any {
    return this.accessor(this.#strength, value, (v) => {
      this.#strength = coerce(v);
      this.#recomputeStrength();
    });
  }
  distance(value?: Accessor<number>): any {
    return this.accessor(this.#distance, value, (v) => {
      this.#distance = coerce(v);
      this.#recomputeDistance();
    });
  }
}

export default function forceLink(links: any[] = []) {
  return new LinkForce(links);
}
