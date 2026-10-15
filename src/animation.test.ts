import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { playDemo, splitGraphemes, type DemoOptions, type DemoPhase } from './animation.ts';

function fixture(t: TestContext) {
  let elapsed = 0;
  let nextFrame = 0;
  const frames = new Map<number, ReturnType<typeof setImmediate>>();
  const overrides = {
    window: { innerWidth: 1200, innerHeight: 800, matchMedia: () => ({ matches: false }) },
    performance: { now: () => elapsed },
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      const id = ++nextFrame;
      frames.set(id, setImmediate(() => {
        frames.delete(id);
        elapsed += 16;
        callback(elapsed);
      }));
      return id;
    },
    cancelAnimationFrame: (id: number) => {
      const handle = frames.get(id);
      if (handle) clearImmediate(handle);
      frames.delete(id);
    },
  };
  const descriptors = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  t.after(() => {
    for (const handle of frames.values()) clearImmediate(handle);
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });

  const classes = new Set<string>();
  const input = {
    isConnected: true,
    value: '',
    scrollTop: 0,
    scrollHeight: 100,
    focus: () => {},
    setSelectionRange: () => {},
    getBoundingClientRect: () => ({ left: 300, top: 300, width: 600, height: 120 }),
  } as unknown as HTMLTextAreaElement;
  const sendButton = {
    isConnected: true,
    getBoundingClientRect: () => ({ left: 840, top: 360, width: 36, height: 36 }),
  } as unknown as HTMLElement;
  const cursor = {
    isConnected: true,
    style: { transform: '' },
    classList: {
      add: (...values: string[]) => values.forEach(value => classes.add(value)),
      remove: (...values: string[]) => values.forEach(value => classes.delete(value)),
    },
  } as unknown as HTMLElement;
  const controller = new AbortController();
  const phases: DemoPhase[] = [];
  const texts: string[] = [];
  let submitted = 0;
  const options: DemoOptions = {
    question: '¿Cómo preparo café? ☕️',
    input,
    sendButton,
    cursor,
    signal: controller.signal,
    onPhase: phase => phases.push(phase),
    onText: text => texts.push(text),
    onSubmit: () => { submitted += 1; },
  };
  return {
    options, controller, classes, phases, texts,
    get submitted() { return submitted; },
    get elapsed() { return elapsed; },
    get pendingFrames() { return frames.size; },
  };
}

test('typing preserves accented graphemes and multi-codepoint emoji', () => {
  assert.deepEqual(splitGraphemes('a\u0301🇪🇸👩🏽‍💻☕️'), ['á', '🇪🇸', '👩🏽‍💻', '☕️']);
});

test('a long question completes in bounded time and submits once', async t => {
  const demo = fixture(t);
  demo.options.question = '¿'.padEnd(998, 'a') + '👩🏽‍💻';
  const started = new Map<DemoPhase, number>();
  demo.options.onPhase = phase => {
    demo.phases.push(phase);
    started.set(phase, demo.elapsed);
  };
  await playDemo(demo.options);

  assert.equal(demo.options.input.value, demo.options.question);
  assert.equal(demo.texts.at(-1), demo.options.question);
  assert.deepEqual(demo.phases, ['moving', 'typing', 'sending', 'complete']);
  assert.equal(demo.submitted, 1);
  assert.ok(started.get('sending')! - started.get('typing')! < 7000);
  assert.equal(demo.pendingFrames, 0);
  assert.equal(demo.classes.size, 0);
});

test('aborting from a typing update prevents submission and clears the cursor', async t => {
  const demo = fixture(t);
  demo.options.onText = text => {
    demo.texts.push(text);
    if (text.length > 4) demo.controller.abort();
  };

  await assert.rejects(playDemo(demo.options), { name: 'AbortError' });
  assert.equal(demo.submitted, 0);
  assert.ok(!demo.phases.includes('complete'));
  assert.equal(demo.pendingFrames, 0);
  assert.equal(demo.classes.size, 0);
});

test('reduced motion uses full text and leaves the fake pointer hidden', async t => {
  const demo = fixture(t);
  demo.options.reducedMotion = true;
  await playDemo(demo.options);

  assert.deepEqual(demo.texts, ['', demo.options.question]);
  assert.deepEqual(demo.phases, ['moving', 'typing', 'sending', 'complete']);
  assert.equal(demo.options.cursor.style.transform, '');
  assert.equal(demo.submitted, 1);
  assert.ok(demo.elapsed < 1000);
  assert.equal(demo.pendingFrames, 0);
  assert.equal(demo.classes.size, 0);
});

test('unmounting during playback cancels without a stale submit', async t => {
  const demo = fixture(t);
  demo.options.onText = text => {
    if (text) Object.defineProperty(demo.options.input, 'isConnected', { value: false });
  };

  await assert.rejects(playDemo(demo.options), { name: 'AbortError' });
  assert.equal(demo.submitted, 0);
  assert.equal(demo.pendingFrames, 0);
  assert.equal(demo.classes.size, 0);
});

function addressField(onChange: (value: string) => void = () => {}) {
  let value = '';
  return {
    isConnected: true,
    get value() { return value; },
    set value(nextValue: string) {
      value = nextValue;
      onChange(nextValue);
    },
    focus: () => {},
    setSelectionRange: () => {},
    getBoundingClientRect: () => ({ left: 300, top: 60, width: 600, height: 36 }),
  } as unknown as HTMLInputElement;
}

test('address stage types the domain before navigation and continues with the same pointer', async t => {
  const demo = fixture(t);
  const addresses: string[] = [];
  demo.options.addressInput = addressField(value => addresses.push(value));
  let navigated = false;
  let cursorAtNavigation = '';
  demo.options.onNavigate = () => {
    assert.equal(demo.options.addressInput!.value, 'chatgpt.com');
    assert.equal(demo.options.input.value, '');
    navigated = true;
    cursorAtNavigation = demo.options.cursor.style.transform;
  };
  demo.options.onPhase = phase => {
    demo.phases.push(phase);
    if (phase === 'moving') {
      assert.ok(navigated);
      assert.equal(demo.options.cursor.style.transform, cursorAtNavigation);
    }
  };

  await playDemo(demo.options);

  assert.deepEqual(addresses, ['', 'c', 'ch', 'cha', 'chat', 'chatg', 'chatgp', 'chatgpt', 'chatgpt.', 'chatgpt.c', 'chatgpt.co', 'chatgpt.com']);
  assert.deepEqual(demo.phases, ['visiting', 'moving', 'typing', 'sending', 'complete']);
  assert.equal(demo.submitted, 1);
  assert.ok(demo.elapsed >= 6500 && demo.elapsed <= 9000, `Total duration: ${demo.elapsed} ms`);
  assert.equal(demo.pendingFrames, 0);
  assert.equal(demo.classes.size, 0);
});

test('cancelling while entering the address prevents navigation and question playback', async t => {
  const demo = fixture(t);
  let navigated = false;
  demo.options.addressInput = addressField(value => {
    if (value.length === 4) demo.controller.abort();
  });
  demo.options.onNavigate = () => { navigated = true; };

  await assert.rejects(playDemo(demo.options), { name: 'AbortError' });

  assert.deepEqual(demo.phases, ['visiting']);
  assert.equal(navigated, false);
  assert.equal(demo.options.input.value, '');
  assert.equal(demo.submitted, 0);
  assert.equal(demo.pendingFrames, 0);
  assert.equal(demo.classes.size, 0);
});

test('reduced motion includes address navigation without pointer animation', async t => {
  const demo = fixture(t);
  const addresses: string[] = [];
  demo.options.addressInput = addressField(value => addresses.push(value));
  demo.options.reducedMotion = true;
  let navigated = false;
  demo.options.onNavigate = () => { navigated = true; };

  await playDemo(demo.options);

  assert.deepEqual(addresses, ['', 'chatgpt.com']);
  assert.deepEqual(demo.phases, ['visiting', 'moving', 'typing', 'sending', 'complete']);
  assert.equal(navigated, true);
  assert.equal(demo.options.cursor.style.transform, '');
  assert.equal(demo.submitted, 1);
  assert.ok(demo.elapsed < 1100);
  assert.equal(demo.pendingFrames, 0);
});
