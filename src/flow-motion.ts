/** Motion is scoped to one render; cancellation cannot publish a stale link. */
export function createFlowMotion(root: HTMLElement) {
  const shell = root.querySelector<HTMLElement>('.steps-shell')!;
  const highlight = root.querySelector<HTMLElement>('.step-highlight')!;
  const animations = new Set<Animation>();
  const decorations = new Set<HTMLElement>();
  let currentStep = 1;
  let disposed = false;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = () => matchMedia('(max-width: 700px), (max-width: 950px) and (max-height: 500px)').matches;

  function animate(element: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) {
    if (disposed || reduced()) return Promise.resolve(false);
    const animation = element.animate(frames, options);
    animations.add(animation);
    return animation.finished.then(() => true, () => false).finally(() => animations.delete(animation));
  }

  function placeHighlight() {
    // Compact steps crossfade in place; resizing the keyboard must not move a backdrop.
    if (disposed || compact()) return;
    const target = shell.querySelector<HTMLElement>(`[data-step="${Math.min(currentStep, 3)}"] .step-group`)!;
    const bounds = shell.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    highlight.style.transform = `translate(${rect.left - bounds.left}px, ${rect.top - bounds.top}px)`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
  }
  const observer = new ResizeObserver(placeHighlight);
  observer.observe(shell);
  shell.querySelectorAll('.step-group').forEach(group => observer.observe(group));
  placeHighlight();
  const readyFrame = requestAnimationFrame(() => shell.classList.add('motion-ready'));

  function decorate(className: string, markup = '') {
    const element = document.createElement('span');
    element.className = className;
    element.setAttribute('aria-hidden', 'true');
    element.innerHTML = markup;
    root.append(element);
    decorations.add(element);
    return element;
  }
  function remove(element: HTMLElement) { element.remove(); decorations.delete(element); }
  function cancelEffects() {
    animations.forEach(animation => animation.cancel());
    decorations.forEach(element => element.remove());
    decorations.clear();
  }

  return {
    cancelEffects,
    createLink() {
      if (disposed) return Promise.resolve(false);
      if (reduced()) return Promise.resolve(true);
      const badge = shell.querySelector<HTMLElement>('[data-step="2"] .step-number')!;
      const link = root.querySelector<HTMLElement>('[data-action="create"] .icon')!;
      if (compact()) {
        return animate(link, [
          { opacity: .4, transform: 'scale(.92)' },
          { opacity: 1, transform: 'scale(1)' },
        ], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
      void animate(link, [
        { opacity: .35, transform: 'scale(.7) rotate(-25deg)' },
        { opacity: 1, transform: 'scale(1.15) rotate(8deg)', offset: .6 },
        { opacity: 1, transform: 'scale(1) rotate(0deg)' },
      ], { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)' });
      return animate(badge, [
        { boxShadow: '0 0 0 0 rgba(32,33,36,.18)' },
        { boxShadow: '0 0 0 10px rgba(32,33,36,0)', offset: .75 },
        { boxShadow: '0 0 0 4px rgba(32,33,36,.03)' },
      ], { duration: 360, easing: 'ease-out' });
    },
    step(step: number) {
      if (step === currentStep) return;
      currentStep = step;
      shell.classList.toggle('is-complete', step > 3);
      placeHighlight();
    },
    reveal(panel: HTMLElement, onReady: () => void) {
      if (reduced()) { onReady(); return; }
      if (compact()) {
        void animate(panel, [
          { opacity: 0, transform: 'translateY(6px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' }).then(done => { if (done && !disposed) onReady(); });
        return;
      }
      const children = [...panel.children] as HTMLElement[];
      children.forEach((child, index) => void animate(child, [
        { opacity: 0, transform: 'translateY(12px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 440, delay: 90 + index * 65, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
      void animate(panel, [
        { opacity: 0, transform: 'translateY(18px) scale(.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ], { duration: 620, easing: 'cubic-bezier(.22,1,.36,1)' }).then(done => { if (done && !disposed) onReady(); });
    },
    celebrate(button: HTMLElement) {
      if (reduced()) return;
      if (compact()) {
        void animate(button, [{ opacity: .7 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
        return;
      }
      void animate(button, [{ transform: 'scale(1)' }, { transform: 'scale(1.055)', offset: .35 }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
      const rect = button.getBoundingClientRect();
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const distance = 42 + (i % 3) * 17;
        const particle = decorate('celebration-particle');
        particle.style.left = `${rect.left + rect.width / 2}px`;
        particle.style.top = `${rect.top + rect.height / 2}px`;
        particle.style.background = ['#202124', '#527fe5', '#92baa8'][i % 3]!;
        void animate(particle, [
          { transform: 'translate(-50%, -50%) scale(0)', opacity: 0 },
          { transform: `translate(${Math.cos(angle) * distance * .6}px, ${Math.sin(angle) * distance * .6 - 12}px) rotate(${i * 37}deg) scale(1)`, opacity: 1, offset: .3 },
          { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance + 16}px) rotate(${i * 67}deg) scale(.35)`, opacity: 0 },
        ], { duration: 650 + (i % 3) * 90, easing: 'cubic-bezier(.15,.65,.35,1)' }).then(() => remove(particle));
      }
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(readyFrame);
      observer.disconnect();
      cancelEffects();
    },
  };
}
