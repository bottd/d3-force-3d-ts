import { dispatch } from "d3-dispatch";
import { timer } from "d3-timer";
import lcg from "./lcg";
import { D3Accessor, Force, type SimNode } from "./force";

const MAX_DIMENSIONS = 3;

export function x(d: SimNode) {
  return d.x;
}
export function y(d: SimNode) {
  return d.y;
}
export function z(d: SimNode) {
  return d.z;
}

const initialRadius = 10;
const initialAngleRoll = Math.PI * (3 - Math.sqrt(5));
const initialAngleYaw = (Math.PI * 20) / (9 + Math.sqrt(221));

export class Simulation extends D3Accessor {
  #alpha = 1;
  #alphaMin = 0.001;
  #alphaDecay = 1 - 0.001 ** (1 / 300);
  #alphaTarget = 0;
  #damping = 0.6;
  #nDim: number;
  #nodes: SimNode[];
  #random: () => number = lcg();
  #forces = new Map<string, Force>();
  #stepper: any;
  #event = dispatch<object, Record<"tick" | "end", any[]>, "tick" | "end">(
    "tick",
    "end",
  );

  constructor(nodes: SimNode[] = [], numDimensions = 2) {
    super();
    this.#nDim = Math.min(
      MAX_DIMENSIONS,
      Math.max(1, Math.round(numDimensions)),
    );
    this.#nodes = nodes;
    this.#initializeNodes();
    this.#stepper = timer(() => this.#step());
  }

  #step() {
    this.tick();
    this.#event.call("tick", this);
    if (this.#alpha < this.#alphaMin) {
      this.#stepper.stop();
      this.#event.call("end", this);
    }
  }

  tick(iterations = 1) {
    const nodes = this.#nodes;
    const nDim = this.#nDim;
    const damping = this.#damping;
    const n = nodes.length;

    for (let k = 0; k < iterations; ++k) {
      this.#alpha += (this.#alphaTarget - this.#alpha) * this.#alphaDecay;

      const alpha = this.#alpha;
      for (const force of this.#forces.values()) force.apply(alpha);

      for (let i = 0; i < n; ++i) {
        const node = nodes[i];
        if (node.fx == null) node.x += node.vx *= damping;
        else {
          node.x = node.fx;
          node.vx = 0;
        }
        if (nDim > 1) {
          if (node.fy == null) node.y += node.vy *= damping;
          else {
            node.y = node.fy;
            node.vy = 0;
          }
        }
        if (nDim > 2) {
          if (node.fz == null) node.z += node.vz *= damping;
          else {
            node.z = node.fz;
            node.vz = 0;
          }
        }
      }
    }

    return this;
  }

  restart() {
    this.#stepper.restart(() => this.#step());
    return this;
  }

  stop() {
    this.#stepper.stop();
    return this;
  }

  numDimensions(): number;
  numDimensions(value: number): this;
  numDimensions(value?: number) {
    return this.accessor(this.#nDim, value, (v) => {
      this.#nDim = Math.min(MAX_DIMENSIONS, Math.max(1, Math.round(v)));
      this.#forces.forEach((f) => this.#initializeForce(f));
    });
  }

  nodes(): SimNode[];
  nodes(value: SimNode[]): this;
  nodes(value?: SimNode[]) {
    return this.accessor(this.#nodes, value, (v) => {
      this.#nodes = v;
      this.#initializeNodes();
      this.#forces.forEach((f) => this.#initializeForce(f));
    });
  }

  alpha(): number;
  alpha(value: number): this;
  alpha(value?: number) {
    return this.accessor(this.#alpha, value, (v) => {
      this.#alpha = +v;
    });
  }

  alphaMin(): number;
  alphaMin(value: number): this;
  alphaMin(value?: number) {
    return this.accessor(this.#alphaMin, value, (v) => {
      this.#alphaMin = +v;
    });
  }

  alphaDecay(): number;
  alphaDecay(value: number): this;
  alphaDecay(value?: number) {
    return this.accessor(this.#alphaDecay, value, (v) => {
      this.#alphaDecay = +v;
    });
  }

  alphaTarget(): number;
  alphaTarget(value: number): this;
  alphaTarget(value?: number) {
    return this.accessor(this.#alphaTarget, value, (v) => {
      this.#alphaTarget = +v;
    });
  }

  velocityDecay(): number;
  velocityDecay(value: number): this;
  velocityDecay(value?: number) {
    return this.accessor(1 - this.#damping, value, (v) => {
      this.#damping = 1 - v;
    });
  }

  randomSource(): () => number;
  randomSource(value: () => number): this;
  randomSource(value?: () => number) {
    return this.accessor(this.#random, value, (v) => {
      this.#random = v;
      this.#forces.forEach((f) => this.#initializeForce(f));
    });
  }

  force(name: string): Force | undefined;
  force(name: string, value: Force | null): this;
  force(name: string, value?: Force | null): Force | undefined | this {
    if (value === undefined) return this.#forces.get(name);
    if (value == null) this.#forces.delete(name);
    else {
      this.#forces.set(name, value);
      this.#initializeForce(value);
    }
    return this;
  }

  find(...args: number[]) {
    const nDim = this.#nDim;
    const nodes = this.#nodes;
    const fx = args.shift() || 0;
    const fy = (nDim > 1 ? args.shift() : null) || 0;
    const fz = (nDim > 2 ? args.shift() : null) || 0;
    let radius = args.shift() || Infinity;

    let closest: SimNode | undefined;
    radius *= radius;

    for (let i = 0, n = nodes.length; i < n; ++i) {
      const node = nodes[i];
      const dx = fx - node.x;
      const dy = fy - (node.y || 0);
      const dz = fz - (node.z || 0);
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < radius) {
        closest = node;
        radius = d2;
      }
    }

    return closest;
  }

  on(name: "tick" | "end"): ((this: Simulation) => void) | undefined;
  on(name: "tick" | "end", listener: ((this: Simulation) => void) | null): this;
  on(
    name: "tick" | "end",
    listener?: ((this: Simulation) => void) | null,
  ): ((this: Simulation) => void) | undefined | this {
    if (listener === undefined)
      return this.#event.on(name) as ((this: Simulation) => void) | undefined;
    this.#event.on(name, listener as ((this: object) => void) | null);
    return this;
  }

  #initializeNodes() {
    const nodes = this.#nodes;
    const nDim = this.#nDim;
    for (let i = 0, n = nodes.length; i < n; ++i) {
      const node = nodes[i];
      node.index = i;
      if (node.fx != null) node.x = node.fx;
      if (node.fy != null) node.y = node.fy;
      if (node.fz != null) node.z = node.fz;
      if (
        isNaN(node.x) ||
        (nDim > 1 && isNaN(node.y)) ||
        (nDim > 2 && isNaN(node.z))
      ) {
        const radius =
          initialRadius *
          (nDim > 2 ? Math.cbrt(0.5 + i) : nDim > 1 ? Math.sqrt(0.5 + i) : i);
        const rollAngle = i * initialAngleRoll;
        const yawAngle = i * initialAngleYaw;

        if (nDim === 1) {
          node.x = radius;
        } else if (nDim === 2) {
          node.x = radius * Math.cos(rollAngle);
          node.y = radius * Math.sin(rollAngle);
        } else {
          node.x = radius * Math.sin(rollAngle) * Math.cos(yawAngle);
          node.y = radius * Math.cos(rollAngle);
          node.z = radius * Math.sin(rollAngle) * Math.sin(yawAngle);
        }
      }
      if (
        isNaN(node.vx) ||
        (nDim > 1 && isNaN(node.vy)) ||
        (nDim > 2 && isNaN(node.vz))
      ) {
        node.vx = 0;
        if (nDim > 1) node.vy = 0;
        if (nDim > 2) node.vz = 0;
      }
    }
  }

  #initializeForce(force: Force) {
    force.initialize(this.#nodes, this.#random, this.#nDim);
  }
}

export default function forceSimulation(
  nodes: SimNode[] = [],
  numDimensions = 2,
) {
  return new Simulation(nodes, numDimensions);
}
