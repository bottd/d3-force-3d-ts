export class SimNode {
  declare index: number;
  declare x: number;
  declare y: number;
  declare z: number;
  declare vx: number;
  declare vy: number;
  declare vz: number;
  declare fx?: number | null;
  declare fy?: number | null;
  declare fz?: number | null;
  [key: string]: any;

  static init<T extends Partial<SimNode>>(obj: T): SimNode & T {
    obj.x ??= NaN;
    obj.y ??= NaN;
    obj.z ??= NaN;
    obj.vx ||= 0;
    obj.vy ||= 0;
    obj.vz ||= 0;
    return obj as SimNode & T;
  }
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
