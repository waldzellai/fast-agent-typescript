/**
 * Simple console progress display for progress events and numeric progress updates.
 */

import { ProgressEvent } from './eventProgress';

export class ConsoleProgressDisplay {
  /**
   * Show a progress event in the console.
   */
  show(event: ProgressEvent): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${event.toString()}`);
  }

  /**
   * Report numeric progress (e.g. tool progress).
   */
  report(progress: number, total?: number): void {
    if (typeof total === 'number' && total > 0) {
      const percent = ((progress / total) * 100).toFixed(1);
      console.log(`Progress: ${progress}/${total} (${percent}%)`);
    } else {
      console.log(`Progress: ${progress}`);
    }
  }
}
