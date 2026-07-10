import { z } from 'zod';
import type { MotionCommand } from '@/lib/motion/types';
import { SchemaType } from '@google/generative-ai';

export const AgenticRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  context: z.object({
    eePosition: z.array(z.number()).length(3),
    jointAngles: z.array(z.number()).length(7),
  }).optional(),
});

export type AgenticRequest = z.infer<typeof AgenticRequestSchema>;

const MotionCommandGeminiSchema = z.object({
  type: z.enum(['jog', 'moveTo', 'rotateJoint', 'pressKey']),
  deltaX: z.number().optional(),
  deltaY: z.number().optional(),
  deltaZ: z.number().optional(),
  target: z.array(z.number()).length(3).optional(),
  joint: z.number().optional(),
  degrees: z.number().optional(),
  keyIndex: z.number().optional(),
});

export const GeminiResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('command'),
    command: MotionCommandGeminiSchema,
    explanation: z.string().optional(),
  }),
  z.object({
    kind: z.literal('question'),
    question: z.string().min(1),
  }),
]);

export type GeminiResponse = z.infer<typeof GeminiResponseSchema>;

export function geminiToMotionCommand(geminiCmd: GeminiResponse & { kind: 'command' }): MotionCommand {
  const cmd = geminiCmd.command;
  switch (cmd.type) {
    case 'jog':
      return {
        type: 'jog',
        deltaX: cmd.deltaX ?? 0,
        deltaY: cmd.deltaY ?? 0,
        deltaZ: cmd.deltaZ ?? 0,
      };
    case 'moveTo':
      return {
        type: 'moveTo',
        target: (cmd.target ?? [0, 0, 0]) as [number, number, number],
      };
    case 'rotateJoint':
      return {
        type: 'rotateJoint',
        joint: cmd.joint ?? 0,
        degrees: cmd.degrees ?? 0,
      };
    case 'pressKey':
      return {
        type: 'pressKey',
        keyIndex: cmd.keyIndex ?? 0,
      };
  }
}

export function buildGeminiResponseSchema(): any {
  return {
    type: SchemaType.OBJECT,
    properties: {
      kind: {
        type: SchemaType.STRING,
        enum: ['command', 'question'],
      },
      command: {
        type: SchemaType.OBJECT,
        properties: {
          type: {
            type: SchemaType.STRING,
            enum: ['jog', 'moveTo', 'rotateJoint', 'pressKey'],
          },
          deltaX: { type: SchemaType.NUMBER },
          deltaY: { type: SchemaType.NUMBER },
          deltaZ: { type: SchemaType.NUMBER },
          target: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.NUMBER },
            minItems: 3,
            maxItems: 3,
          },
          joint: { type: SchemaType.NUMBER },
          degrees: { type: SchemaType.NUMBER },
          keyIndex: { type: SchemaType.NUMBER },
        },
        required: ['type'],
      },
      question: { type: SchemaType.STRING },
      explanation: { type: SchemaType.STRING },
    },
    required: ['kind'],
  };
}
