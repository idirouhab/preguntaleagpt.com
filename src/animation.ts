export type DemoPhase = 'visiting' | 'moving' | 'typing' | 'sending' | 'complete';

export interface DemoOptions {
  question: string;
  input: HTMLTextAreaElement;
  sendButton: HTMLElement;
  cursor: HTMLElement;
  signal: AbortSignal;
  addressInput?: HTMLInputElement;
  reducedMotion?: boolean;
  onNavigate?: () => void;
  onPhase: (phase: DemoPhase) => void;
  onText: (text: string) => void;
  onSubmit: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface GraphemeSegmenter {
  segment: (text: string) => Iterable<{ segment: string }>;
}

/** Keep accents, skin tones, flags, and joined emoji together while typing. */
export function splitGraphemes(text: string): string[] {
  const Segmenter = (Intl as typeof Intl & {
    Segmenter?: new (
      locale: string,
      options: { granularity: 'grapheme' },
    ) => GraphemeSegmenter;
  }).Segmenter;

  if (Segmenter) {
    return Array.from(
      new Segmenter('es', { granularity: 'grapheme' }).segment(text),
      ({ segment }) => segment,
    );
  }

  // Older browsers still preserve surrogate pairs instead of typing half an emoji.
  return Array.from(text);
}

function abortError(): DOMException {
  return new DOMException('La demostración se ha cancelado.', 'AbortError');
}

/**
 * Play one demonstration. Cancellation rejects with AbortError; the caller owns
 * its AbortController and should abort before replacing any of the supplied nodes.
 * CSS owns cursor appearance and fixed positioning, with its origin at (0, 0).
 */
export async function playDemo(options: DemoOptions): Promise<void> {
  const {
    question, input, sendButton, cursor, signal, addressInput,
    onNavigate, onPhase, onText, onSubmit,
  } = options;
  const reducedMotion = options.reducedMotion ??
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const assertActive = () => {
    if (signal.aborted || !input.isConnected || !sendButton.isConnected ||
      !cursor.isConnected || (addressInput && !addressInput.isConnected)) {
      throw abortError();
    }
  };

  /** Each step owns precisely one frame and one abort listener. */
  const animate = (duration: number, render: (progress: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      let frame: number | undefined;
      let settled = false;
      const started = performance.now();

      const cleanup = () => {
        if (frame !== undefined) cancelAnimationFrame(frame);
        signal.removeEventListener('abort', cancel);
      };

      const fail = (error: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      const cancel = () => fail(abortError());

      const tick = (now: number) => {
        frame = undefined;
        if (settled) return;
        try {
          assertActive();
          const progress = Math.min(1, Math.max(0, (now - started) / duration));
          render(progress);
          // A render callback may synchronously cancel the demo.
          if (settled) return;
          assertActive();
          if (progress >= 1) {
            settled = true;
            cleanup();
            resolve();
          } else {
            frame = requestAnimationFrame(tick);
          }
        } catch (error) {
          fail(error);
        }
      };

      signal.addEventListener('abort', cancel, { once: true });
      tick(started);
    });
  };

  const pause = (duration: number) => animate(duration, () => {});
  const phase = (value: DemoPhase) => {
    assertActive();
    onPhase(value);
    assertActive();
  };
  const setText = (value: string) => {
    assertActive();
    input.value = value;
    onText(value);
    assertActive();
    input.setSelectionRange(value.length, value.length);
    // Run this after onText, which can resize the textarea.
    input.scrollTop = input.scrollHeight;
  };

  let position: Point = {
    x: Math.max(24, window.innerWidth * 0.79),
    y: Math.max(24, window.innerHeight * 0.79),
  };

  const paintCursor = (point: Point) => {
    position = point;
    cursor.style.transform = `translate3d(${point.x.toFixed(2)}px, ${point.y.toFixed(2)}px, 0)`;
  };

  const moveCursor = (getTarget: () => Point) => {
    const origin = { ...position };
    const firstTarget = getTarget();
    const distance = Math.hypot(firstTarget.x - origin.x, firstTarget.y - origin.y);
    const duration = Math.min(1200, Math.max(650, 580 + distance * 0.7));
    const bendDirection = Math.random() < 0.5 ? -1 : 1;

    return animate(duration, (progress) => {
      // Re-read the destination every frame so a resize or textarea growth does
      // not leave the mouse clicking where the target used to be.
      const target = getTarget();
      const dx = target.x - origin.x;
      const dy = target.y - origin.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const bend = Math.min(105, length * 0.19) * bendDirection;
      const nx = -dy / length;
      const ny = dx / length;
      const controlA = {
        x: origin.x + dx * 0.3 + nx * bend,
        y: origin.y + dy * 0.3 + ny * bend,
      };
      const controlB = {
        x: origin.x + dx * 0.82 + nx * bend * 0.55,
        y: origin.y + dy * 0.82 + ny * bend * 0.55,
      };
      // Minimum-jerk easing starts and stops naturally.
      const t = progress ** 3 * (10 - 15 * progress + 6 * progress ** 2);
      const u = 1 - t;
      paintCursor({
        x: u ** 3 * origin.x + 3 * u ** 2 * t * controlA.x +
          3 * u * t ** 2 * controlB.x + t ** 3 * target.x,
        y: u ** 3 * origin.y + 3 * u ** 2 * t * controlA.y +
          3 * u * t ** 2 * controlB.y + t ** 3 * target.y,
      });
    });
  };

  const clickCursor = async () => {
    assertActive();
    cursor.classList.add('is-clicking');
    try {
      await pause(210);
    } finally {
      cursor.classList.remove('is-clicking');
    }
  };

  try {
    assertActive();
    cursor.classList.remove('is-visible', 'is-clicking');
    setText('');
    if (!reducedMotion) {
      paintCursor(position);
      cursor.classList.add('is-visible');
    }

    if (addressInput) {
      const address = 'chatgpt.com';
      phase('visiting');
      addressInput.value = '';
      if (reducedMotion) {
        await pause(140);
        addressInput.value = address;
        await pause(180);
      } else {
        await moveCursor(() => {
          const rect = addressInput.getBoundingClientRect();
          return {
            x: rect.left + Math.min(80, rect.width * 0.25),
            y: rect.top + rect.height / 2,
          };
        });
        await clickCursor();
        addressInput.focus({ preventScroll: true });
        let count = 0;
        await animate(Math.min(900, address.length * 65), (progress) => {
          const nextCount = Math.floor(address.length * progress);
          if (nextCount !== count) {
            count = nextCount;
            addressInput.value = address.slice(0, count);
            addressInput.setSelectionRange(count, count);
          }
        });
        await pause(280);
      }
      assertActive();
      onNavigate?.();
      assertActive();
    }

    phase('moving');

    if (reducedMotion) {
      await pause(160);
      phase('typing');
      setText(question);
      await pause(280);
      phase('sending');
      await pause(180);
    } else {
      await moveCursor(() => {
        const rect = input.getBoundingClientRect();
        return {
          x: rect.left + Math.min(72, rect.width * 0.25),
          y: rect.top + Math.min(24, rect.height * 0.5),
        };
      });
      await clickCursor();
      input.focus({ preventScroll: true });
      phase('typing');

      const characters = splitGraphemes(question);
      // Scale a weighted schedule to a fixed duration instead of adding a timer
      // per character. Long questions can reveal several graphemes per frame.
      const duration = addressInput
        ? Math.min(4000, Math.max(2800, characters.length * 48))
        : Math.min(6500, Math.max(2000, characters.length * 48));
      let totalWeight = 0;
      const cumulativeWeights = characters.map((character) => {
        const punctuationWeight = /[.!?¿¡,;:\n]/u.test(character) ? 2.4 : 1;
        totalWeight += (0.7 + Math.random() * 0.6) * punctuationWeight;
        return totalWeight;
      });
      let count = 0;
      let text = '';

      await animate(duration, (progress) => {
        const availableWeight = totalWeight * progress;
        const previousCount = count;
        while (count < characters.length &&
          (progress === 1 || cumulativeWeights[count]! <= availableWeight)) {
          text += characters[count];
          count += 1;
        }
        if (count !== previousCount) setText(text);
      });

      await pause(280);
      phase('sending');
      await moveCursor(() => {
        const rect = sendButton.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
      await clickCursor();
    }

    assertActive();
    onSubmit();
    // Submission is allowed to replace the supplied DOM nodes. A real abort,
    // however, must still prevent any subsequent state transition.
    if (signal.aborted) throw abortError();
    onPhase('complete');
  } finally {
    cursor.classList.remove('is-visible', 'is-clicking');
  }
}
