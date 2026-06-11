import { create } from 'zustand';

const STORAGE_KEY = 'theme';

const applyTheme = (theme) => {
  document.documentElement.classList.toggle('light', theme === 'light');
};

const initial = localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
applyTheme(initial);

const useThemeStore = create((set, get) => ({
  theme: initial,

  // Révélation en cercle depuis le point cliqué (View Transitions API).
  // Le changement de thème est un pur swap de variables CSS (classe sur <html>),
  // donc pas besoin de flushSync : le DOM est déjà à jour dans le callback.
  toggleTheme: (event) => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);

    if (!document.startViewTransition || !event) {
      applyTheme(next);
      set({ theme: next });
      return;
    }

    const x = event.clientX, y = event.clientY;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = document.startViewTransition(() => applyTheme(next));
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 600, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    });
    set({ theme: next });
  },
}));

export default useThemeStore;
