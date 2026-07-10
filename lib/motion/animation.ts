export class AnimationController {
  private frameId: number | null = null;
  private startAngles: number[] = [];
  private targetAngles: number[] = [];
  private startTime = 0;
  private duration = 200;
  private onFrame: ((angles: number[]) => void) | null = null;
  private onComplete: (() => void) | null = null;
  private running = false;

  start(
    currentAngles: number[],
    targetAngles: number[],
    onFrame: (angles: number[]) => void,
    onComplete?: () => void,
    duration = 200,
  ) {
    this.stop();
    this.startAngles = [...currentAngles];
    this.targetAngles = [...targetAngles];
    this.duration = duration;
    this.onFrame = onFrame;
    this.onComplete = onComplete ?? null;
    this.startTime = performance.now();
    this.running = true;
    this.tick();
  }

  stop() {
    this.running = false;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  private tick = () => {
    if (!this.running) return;
    const elapsed = performance.now() - this.startTime;
    const t = Math.min(elapsed / this.duration, 1);
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const angles = this.startAngles.map((s, i) =>
      s + (this.targetAngles[i] - s) * eased,
    );
    this.onFrame?.(angles);

    if (t < 1) {
      this.frameId = requestAnimationFrame(this.tick);
    } else {
      this.running = false;
      this.onComplete?.();
    }
  };
}
