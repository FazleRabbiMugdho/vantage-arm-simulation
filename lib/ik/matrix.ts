export type Mat4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

export function mat4Identity(): Mat4 {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

export function mat4Translate(tx: number, ty: number, tz: number): Mat4 {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    tx, ty, tz, 1,
  ];
}

function normalizeAxis(ax: number, ay: number, az: number): [number, number, number] {
  const len = Math.sqrt(ax * ax + ay * ay + az * az);
  if (len < 1e-10) return [0, 0, 1];
  return [ax / len, ay / len, az / len];
}

export function mat4Rotate(axis: [number, number, number], angle: number): Mat4 {
  const [ax, ay, az] = normalizeAxis(axis[0], axis[1], axis[2]);
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  const t = 1 - c;
  return [
    t * ax * ax + c,       t * ax * ay + az * s,  t * ax * az - ay * s, 0,
    t * ax * ay - az * s,  t * ay * ay + c,       t * ay * az + ax * s, 0,
    t * ax * az + ay * s,  t * ay * az - ax * s,  t * az * az + c,      0,
    0,                     0,                     0,                     1,
  ];
}

export function mat4Multiply(a: Mat4, b: Mat4): Mat4 {
  const out: number[] = new Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + row] * b[col * 4 + k];
      }
      out[col * 4 + row] = sum;
    }
  }
  return out as Mat4;
}

export function mat4GetPosition(m: Mat4): [number, number, number] {
  return [m[12], m[13], m[14]];
}
