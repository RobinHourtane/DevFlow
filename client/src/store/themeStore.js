import { create } from 'zustand';

const STORAGE_KEY = 'theme';

const applyTheme = (theme) => {
  document.documentElement.classList.toggle('light', theme === 'light');
};

const initial = localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
applyTheme(initial);

const useThemeStore = create((set, get) => ({
  theme: initial,

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    set({ theme: next });
  },
}));

export default useThemeStore;
