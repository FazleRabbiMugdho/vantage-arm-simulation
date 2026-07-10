import { z } from 'zod';
import raw from '@/public/key_config.json';

const KeyConfigSchema = z.object({
  frame: z.string(),
  units: z.string(),
  approach_axis: z.string(),
  keys: z.record(
    z.string(),
    z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    })
  ).refine(
    (keys) => {
      const expected = ['1', '2', '3', '4', '5', '6'];
      return expected.every((k) => k in keys);
    },
    { message: 'key_config.json must contain keys 1-6' }
  ),
});

export type KeyPanelConfig = z.infer<typeof KeyConfigSchema>;
export type KeyEntry = KeyPanelConfig['keys'][string];

const parsed = KeyConfigSchema.parse(raw);

export const keyConfig: KeyPanelConfig = parsed;

export const KEY_POSITIONS: KeyEntry[] = ['1', '2', '3', '4', '5', '6'].map(
  (k) => parsed.keys[k]
);

export const APPROACH_OFFSET = 0.04;
