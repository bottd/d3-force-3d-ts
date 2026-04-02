export interface SimNode {
  index: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
  [key: string]: any;
}

export type Accessor<T> = T | ((...args: any[]) => T);

export type Accessors<Self, T, Keys extends string> = {
  [K in Keys]: {
    (): T;
    (value: T): Self;
  };
};

export function resolve(
  accessor: Accessor<number>,
  datum: any,
  index: number,
  data: any[],
): number {
  return typeof accessor === "function"
    ? +accessor(datum, index, data)
    : +accessor;
}

export class D3Accessor {
  protected accessor<T>(
    current: T,
    value: T | undefined,
    set: (v: T) => void,
  ): T | this {
    if (value === undefined) return current;
    set(value);
    return this;
  }
}

export abstract class Force extends D3Accessor {
  abstract initialize(
    nodes: SimNode[],
    random: () => number,
    nDim: number,
  ): void;
  abstract apply(alpha: number): void;
}

export function coerce(value: Accessor<number>): Accessor<number> {
  return typeof value === "function" ? value : +value;
}
