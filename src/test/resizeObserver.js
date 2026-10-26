// A ResizeObserver stand-in for jsdom, which has none and lays nothing out
// (spec 018). Every observed element reports `current` -- 800x600 by default --
// so the canvas screens render their stage in tests. resizeTo() changes the size
// and notifies every active observer; wrap it in act().

let current = { width: 800, height: 600 };
const active = new Set();

class ResizeObserverStub {
  constructor(callback) {
    this.callback = callback;
    this.targets = new Set();
  }

  observe(target) {
    this.targets.add(target);
    active.add(this);
    this.notify(target);
  }

  unobserve(target) {
    this.targets.delete(target);
  }

  disconnect() {
    this.targets.clear();
    active.delete(this);
  }

  notify(target) {
    this.callback([{ target, contentRect: { width: current.width, height: current.height } }]);
  }
}

export const installResizeObserver = (size = { width: 800, height: 600 }) => {
  current = { ...size };
  active.clear();
  window.ResizeObserver = ResizeObserverStub;
};

export const uninstallResizeObserver = () => {
  active.clear();
  delete window.ResizeObserver;
};

export const resizeTo = (width, height) => {
  current = { width, height };
  [...active].forEach((observer) => observer.targets.forEach((target) => observer.notify(target)));
};

export const activeObserverCount = () => active.size;
