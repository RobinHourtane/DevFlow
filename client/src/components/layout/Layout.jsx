import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import GlobalSearch, { useGlobalSearch } from '../devflow/GlobalSearch';

export default function Layout({ children }) {
  const { open, setOpen } = useGlobalSearch();

  return (
    <div className="flex h-full bg-[var(--bg-0)]">
      <Sidebar onSearchOpen={() => setOpen(true)} />
      <motion.main
        className="flex-1 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.main>

      <AnimatePresence>
        {open && <GlobalSearch open={open} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
