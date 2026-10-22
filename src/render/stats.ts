export interface StatsSummary {
  frames: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  avgFps: number;
}

export class FrameStats {
  private readonly samples: number[] = [];

  push(frameMs: number): void {
    this.samples.push(frameMs);
  }

  reset(): void {
    this.samples.length = 0;
  }

  summary(): StatsSummary {
    const n = this.samples.length;
    if (n === 0) {
      return { frames: 0, avgMs: 0, p50Ms: 0, p95Ms: 0, maxMs: 0, avgFps: 0 };
    }
    const sorted = [...this.samples].sort((a, b) => a - b);
    const at = (q: number): number => {
      const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
      return sorted[idx] as number;
    };
    let total = 0;
    for (const v of sorted) total += v;
    const avgMs = total / n;
    return {
      frames: n,
      avgMs,
      p50Ms: at(0.5),
      p95Ms: at(0.95),
      maxMs: sorted[sorted.length - 1] as number,
      avgFps: avgMs > 0 ? 1000 / avgMs : 0,
    };
  }
}
