import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgenticRequestSchema, GeminiResponseSchema, buildGeminiResponseSchema, geminiToMotionCommand } from '@/lib/agentic/schema';
import type { MotionCommand } from '@/lib/motion/types';

function buildSystemPrompt(context?: { eePosition: number[]; jointAngles: number[] }): string {
  const pos = context?.eePosition;
  const joints = context?.jointAngles;

  let prompt = `You are a robotic arm controller. Convert natural language instructions into structured commands.

AVAILABLE COMMAND TYPES (output one of these in the "command" field):

1. jog — Move the end-effector by a delta (relative offset) in XYZ space.
   Fields: type="jog", deltaX (meters), deltaY (meters), deltaZ (meters)
   Typical values: 0.01 to 0.1 meters per step.
   Example: "move up" → { type: "jog", deltaX: 0, deltaY: 0, deltaZ: 0.05 }

2. moveTo — Move the end-effector to an absolute XYZ position.
   Fields: type="moveTo", target [x, y, z] in meters
   The key panel is around x=0.5-0.6, y=±0.05, z=0.05.
   Example: "go to the key panel" → { type: "moveTo", target: [0.55, 0, 0.05] }

3. rotateJoint — Rotate a specific joint by degrees (relative).
   Fields: type="rotateJoint", joint (0-6), degrees (positive=left, negative=right)
   Joints: 0=base, 1=shoulder, 2=elbow, 3=wrist_1, 4=wrist_2, 5=wrist_3, 6=stylus_pitch
   Example: "rotate the base left 45 degrees" → { type: "rotateJoint", joint: 0, degrees: 45 }

4. pressKey — Press a numbered key on the panel.
   Fields: type="pressKey", keyIndex (0-5, where 0=key 1, 5=key 6)
   Example: "press key 3" → { type: "pressKey", keyIndex: 2 }

RULES:
- If the instruction is ambiguous or missing details, respond with kind="question" and ask for the missing information. Do NOT guess.
- If the instruction is clear, respond with kind="command" and the appropriate command.
- Use the "explanation" field to briefly describe what the command does.
- Only output ONE command per response. If the user asks multiple things, pick the most important one and explain.
- Never output a command that would damage the arm — use reasonable values.`;

  if (pos) {
    prompt += `\n\nCurrent end-effector position: x=${pos[0].toFixed(3)}, y=${pos[1].toFixed(3)}, z=${pos[2].toFixed(3)} meters.`;
  }
  if (joints) {
    prompt += `\nCurrent joint angles (radians): [${joints.map((j: number) => j.toFixed(3)).join(', ')}].`;
  }

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = AgenticRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { kind: 'error', error: 'Invalid request: ' + parsed.error.message },
        { status: 400 }
      );
    }

    const { message, context } = parsed.data;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { kind: 'error', error: 'Gemini API key not configured. Set GEMINI_API_KEY in .env.local' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemPrompt = buildSystemPrompt(context);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: buildGeminiResponseSchema(),
      },
    });

    const result = await model.generateContent(message);
    const text = result.response.text();

    if (!text || !text.trim()) {
      return NextResponse.json(
        { kind: 'question', question: 'I did not get a response. Could you rephrase your instruction?' },
        { status: 200 }
      );
    }

    let geminiResponse: any;
    try {
      geminiResponse = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { kind: 'question', question: 'I had trouble understanding that. Could you rephrase?' },
        { status: 200 }
      );
    }

    const validated = GeminiResponseSchema.safeParse(geminiResponse);
    if (!validated.success) {
      return NextResponse.json(
        { kind: 'question', question: 'I parsed your instruction but the result did not pass validation. Could you try a simpler command?' },
        { status: 200 }
      );
    }

    const response = validated.data;

    if (response.kind === 'command') {
      const command: MotionCommand = geminiToMotionCommand(response);
      return NextResponse.json({
        kind: 'command',
        command,
        explanation: response.explanation,
      });
    }

    return NextResponse.json({
      kind: 'question',
      question: response.question,
    });

  } catch (err: any) {
    console.error('[Agentic] Error:', err.message);

    if (err.message?.includes('API_KEY') || err.message?.includes('API key')) {
      return NextResponse.json(
        { kind: 'error', error: 'Invalid or expired Gemini API key.' },
        { status: 500 }
      );
    }

    if (err.message?.includes('SAFETY') || err.message?.includes('safety')) {
      return NextResponse.json(
        { kind: 'question', question: 'Your instruction was blocked by safety filters. Please rephrase.' },
        { status: 200 }
      );
    }

    if (
      err.message?.includes('quota') ||
      err.message?.includes('Quota') ||
      err.message?.includes('limit') ||
      err.message?.includes('429') ||
      err.message?.includes('Requests')
    ) {
      return NextResponse.json(
        { kind: 'error', error: 'Gemini API quota exceeded or rate limited. Please check your AI Studio plan and billing details.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { kind: 'error', error: `Agentic service error: ${err.message}` },
      { status: 500 }
    );
  }
}
