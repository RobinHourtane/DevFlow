import { useState } from 'react';
import { flushSync } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, RadialBarChart, RadialBar,
} from 'recharts';
import {
  LayoutDashboard, Sparkles, FileText, CreditCard, Wallet, ShieldCheck, Users,
  Settings, Sun, Moon, ChevronDown, AlertTriangle, TrendingUp, TrendingDown,
  CheckCircle2, Clock, XCircle, Eye, Plus, UserPlus, BarChart3, Banknote,
  CalendarDays, ChevronLeft, ChevronRight, ArrowLeft, Landmark, Bell,
} from 'lucide-react';

/* ─── Mock data ──────────────────────────────────────────────────────────── */

const TABS = ['Overview', 'Analytics', 'Performance', 'AI Insights'];

const performanceData = [
  { month: 'Jan', disbursements: 2.4, collections: 2.1 },
  { month: 'Feb', disbursements: 2.6, collections: 2.4 },
  { month: 'Mar', disbursements: 2.8, collections: 2.6 },
  { month: 'Apr', disbursements: 3.0, collections: 2.8 },
  { month: 'May', disbursements: 3.1, collections: 3.0 },
  { month: 'Jun', disbursements: 3.2, collections: 3.1 },
];

const distributionData = [
  { name: 'Personal', value: 45, color: '#8b5cf6' },
  { name: 'BNPL',     value: 30, color: '#f59e0b' },
  { name: 'Business', value: 25, color: '#22c55e' },
];

const scoreGaugeData = [
  { name: 'Poor', value: 11, fill: '#ef4444' },
  { name: 'Fair', value: 27, fill: '#f59e0b' },
  { name: 'Good', value: 62, fill: '#22c55e' },
];

const STATUS_CFG = {
  PENDING:  { label: 'Pending',      icon: Clock,        cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400' },
  APPROVED: { label: 'Approved',     icon: CheckCircle2, cls: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' },
  REJECTED: { label: 'Rejected',     icon: XCircle,      cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
  REVIEW:   { label: 'Under Review', icon: Eye,          cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
};

const TYPE_CLS = {
  Personal: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
  BNPL:     'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  Business: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
};

const SCORE_COLOR = { 'A+': 'text-green-500', A: 'text-green-500', B: 'text-amber-500', C: 'text-red-500' };

const borrowers = [
  { id: 1, name: 'Camille Durand', loanId: 'LN-20481', amount: '$18,500', months: 24, type: 'Personal', score: 'A+', scoreVal: 92, status: 'APPROVED', action: 'Disburse' },
  { id: 2, name: 'Yanis Belkacem', loanId: 'LN-20482', amount: '$4,200',  months: 6,  type: 'BNPL',     score: 'B',  scoreVal: 74, status: 'PENDING',  action: 'Review' },
  { id: 3, name: 'Sofia Martins',  loanId: 'LN-20483', amount: '$62,000', months: 48, type: 'Business', score: 'A',  scoreVal: 88, status: 'REVIEW',   action: 'Details' },
  { id: 4, name: 'Lucas Bernard',  loanId: 'LN-20484', amount: '$9,800',  months: 12, type: 'Personal', score: 'C',  scoreVal: 58, status: 'REJECTED', action: 'Details' },
  { id: 5, name: 'Inès Laurent',   loanId: 'LN-20485', amount: '$2,500',  months: 3,  type: 'BNPL',     score: 'A+', scoreVal: 95, status: 'APPROVED', action: 'Disburse' },
  { id: 6, name: 'Thomas Garcia',  loanId: 'LN-20486', amount: '$35,000', months: 36, type: 'Business', score: 'B',  scoreVal: 71, status: 'PENDING',  action: 'Review' },
];

const riskAlerts = [
  { color: 'text-red-500',   text: '3 borrowers show increased default probability (+18%)' },
  { color: 'text-amber-500', text: '12 EMIs due within the next 48 hours' },
  { color: 'text-amber-500', text: 'BNPL volume approaching 80% of monthly limit' },
];

const activity = [
  { time: '2m ago',  text: 'New loan approved — LN-20485 (Inès Laurent)' },
  { time: '18m ago', text: 'EMI collected — $420 (Yanis Belkacem)' },
  { time: '1h ago',  text: 'New borrower added — Thomas Garcia' },
  { time: '3h ago',  text: 'AI score recalculated — LN-20484 downgraded to C' },
  { time: '5h ago',  text: 'Reminder sent — 2 overdue EMIs' },
];

const quickActions = [
  { label: 'New Loan',     icon: Plus },
  { label: 'BNPL Plan',    icon: CreditCard },
  { label: 'Collect EMI',  icon: Banknote },
  { label: 'Add Borrower', icon: UserPlus },
  { label: 'Reports',      icon: BarChart3 },
  { label: 'AI Analysis',  icon: Sparkles },
];

const collectionSummary = [
  { day: 'Mon', collected: 18.2, overdue: 1.2 },
  { day: 'Tue', collected: 21.4, overdue: 0.8 },
  { day: 'Wed', collected: 19.8, overdue: 2.1 },
  { day: 'Thu', collected: 24.6, overdue: 0.6 },
  { day: 'Fri', collected: 27.2, overdue: 1.5 },
  { day: 'Sat', collected: 9.8,  overdue: 0.4 },
  { day: 'Sun', collected: 4.2,  overdue: 0.2 },
];

const EMI_DUE_DAYS = [3, 5, 9, 12, 15, 18, 21, 24, 27, 30];

const SIDEBAR_ICONS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Sparkles,        label: 'AI Insights' },
  { icon: FileText,        label: 'Loan Application' },
  { icon: Landmark,        label: 'Active Loans' },
  { icon: CreditCard,      label: 'BNPL Plans' },
  { icon: Wallet,          label: 'Repayments' },
  { icon: ShieldCheck,     label: 'Risk & Collections' },
  { icon: Users,           label: 'Borrowers' },
];

/* ─── Petits composants ──────────────────────────────────────────────────── */

function Card({ className = '', children }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/60 ${className}`}>
      {children}
    </div>
  );
}

function ChartTooltip({ active, payload, label, unit = 'M' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-semibold mb-1 text-gray-900 dark:text-gray-100">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name} : ${p.value}{unit}
        </p>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

/* Mini jauge circulaire (Collection Rate) */
function MiniRing({ pct }) {
  const r = 20, c = 2 * Math.PI * r;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90">
      <circle cx="26" cy="26" r={r} fill="none" strokeWidth="5" className="stroke-gray-200 dark:stroke-gray-700" />
      <circle cx="26" cy="26" r={r} fill="none" strokeWidth="5" stroke="#8b5cf6" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
    </svg>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function Loans() {
  const [dark, setDark] = useState(() => localStorage.getItem('loanprox-theme') === 'dark');
  const [tab, setTab] = useState('Overview');

  // Bascule avec révélation en cercle depuis le bouton (View Transitions API)
  const toggleTheme = (e) => {
    const next = !dark;
    localStorage.setItem('loanprox-theme', next ? 'dark' : 'light');

    if (!document.startViewTransition) { setDark(next); return; }

    const x = e.clientX, y = e.clientY;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = document.startViewTransition(() => {
      flushSync(() => setDark(next));
    });
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 600, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    });
  };

  const axisTick = { fill: dark ? '#9ca3af' : '#6b7280', fontSize: 11 };
  const gridStroke = dark ? '#374151' : '#e5e7eb';

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans antialiased">

        {/* ── Sidebar icônes ── */}
        <aside className="w-16 shrink-0 flex flex-col items-center py-4 gap-1 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700/60">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white font-bold text-lg mb-4">
            L
          </div>
          {SIDEBAR_ICONS.map(({ icon: Icon, label, active }) => (
            <button key={label} title={label}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                active
                  ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400'
                  : 'text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-gray-700/60 dark:hover:text-violet-400'
              }`}>
              <Icon size={18} strokeWidth={1.8} />
            </button>
          ))}
          <div className="flex-1" />
          <Link to="/dashboard" title="Retour à DevFlow"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-gray-700/60 dark:hover:text-violet-400 transition-colors">
            <ArrowLeft size={18} strokeWidth={1.8} />
          </Link>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">

          {/* ── Top navbar ── */}
          <header className="shrink-0 flex items-center justify-between px-6 h-14 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/60">
            <nav className="flex items-center gap-1">
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    tab === t
                      ? 'bg-violet-600 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400'
                  }`}>
                  {t}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                <CalendarDays size={14} />
                Last 30 Days
                <ChevronDown size={14} />
              </button>
              <button onClick={toggleTheme} title={dark ? 'Light mode' : 'Dark mode'}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
                {dark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
                <Bell size={17} />
              </button>
              <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
                <Settings size={17} />
              </button>
            </div>
          </header>

          {/* ── Contenu ── */}
          <main className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* Bannière d'alerte IA */}
            <div className="flex items-center gap-4 px-5 py-3.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
              <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white shrink-0">
                <Sparkles size={16} />
              </div>
              <p className="flex-1 text-sm">
                <span className="inline-block align-middle mr-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold tracking-wide">HIGH PRIORITY</span>
                <span className="font-semibold">AI Risk Alert:</span>{' '}
                <span className="text-gray-600 dark:text-gray-300">3 borrowers show increased default probability. 12 EMIs due today with collection risk. Review recommended.</span>
              </p>
              <button className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors">
                <Eye size={14} />
                View Details
              </button>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card className="p-5">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Portfolio</p>
                  <span className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center text-violet-600 dark:text-violet-400"><Wallet size={15} /></span>
                </div>
                <p className="text-3xl font-bold mt-1">$12.8M</p>
                <p className="flex items-center gap-1 text-xs mt-2 text-green-500 font-medium">
                  <TrendingUp size={13} /> +12.5% <span className="text-gray-400 dark:text-gray-500 font-normal">vs last month</span>
                </p>
              </Card>

              <Card className="p-5">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Loans</p>
                  <span className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-500/15 flex items-center justify-center text-green-600 dark:text-green-400"><Landmark size={15} /></span>
                </div>
                <p className="text-3xl font-bold mt-1">2,847</p>
                <p className="text-xs mt-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 font-medium">24 pending approval</span>
                </p>
              </Card>

              <Card className="p-5">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">BNPL Volume</p>
                  <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400"><CreditCard size={15} /></span>
                </div>
                <p className="text-3xl font-bold mt-1">$3.2M</p>
                <p className="flex items-center gap-1 text-xs mt-2 text-green-500 font-medium">
                  <TrendingUp size={13} /> +28.4% <span className="text-gray-400 dark:text-gray-500 font-normal">trending up</span>
                </p>
              </Card>

              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Collection Rate</p>
                    <p className="text-3xl font-bold mt-1">94.7%</p>
                    <p className="flex items-center gap-1 text-xs mt-2 text-red-500 font-medium">
                      <TrendingDown size={13} /> needs attention
                    </p>
                  </div>
                  <MiniRing pct={94.7} />
                </div>
              </Card>
            </div>

            {/* Mini KPI cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { label: "Today's EMIs",  value: '$287K', icon: CalendarDays, cls: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-500/15' },
                { label: 'New Borrowers', value: '47',    icon: UserPlus,     cls: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-500/15' },
                { label: 'Collected',     value: '$241K', icon: CheckCircle2, cls: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/15' },
                { label: 'Overdue',       value: '$46K',  icon: AlertTriangle, cls: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/15' },
              ].map(({ label, value, icon: Icon, cls }) => (
                <Card key={label} className="px-4 py-3 flex items-center gap-3">
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cls}`}><Icon size={16} /></span>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
                    <p className="text-lg font-bold leading-tight">{value}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Grille principale : contenu + panneau latéral */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">

              {/* Colonne principale */}
              <div className="space-y-5 min-w-0">

                {/* Graphiques */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5">
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="font-semibold">Portfolio Performance</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Loan disbursements & collections trend</p>
                      </div>
                      <div className="flex gap-1">
                        {['6M', '1Y', 'All'].map((p, i) => (
                          <button key={p} className={`px-2.5 py-1 rounded-md text-xs font-medium ${i === 0 ? 'bg-violet-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60'}`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={210}>
                      <AreaChart data={performanceData}>
                        <defs>
                          <linearGradient id="gradDisb" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradColl" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                        <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => `${v}M`} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="disbursements" name="Disbursements" stroke="#8b5cf6" strokeWidth={2}
                          fill="url(#gradDisb)" dot={{ r: 3, fill: '#8b5cf6' }} />
                        <Area type="monotone" dataKey="collections" name="Collections" stroke="#22c55e" strokeWidth={2}
                          fill="url(#gradColl)" dot={{ r: 3, fill: '#22c55e' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500" /> Disbursements</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Collections</span>
                    </div>
                  </Card>

                  <Card className="p-5">
                    <h2 className="font-semibold">Loan Distribution</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">By loan type</p>
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie data={distributionData} dataKey="value" nameKey="name"
                          innerRadius={52} outerRadius={78} paddingAngle={3} stroke="none">
                          {distributionData.map(d => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md px-3 py-2 text-xs font-medium">
                              {payload[0].name} — {payload[0].value}%
                            </div>
                          );
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-1">
                      {distributionData.map(d => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                            <span className="w-2 h-2 rounded-full" style={{ background: d.color }} /> {d.name}
                          </span>
                          <span className="font-semibold">{d.value}%</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* Tableau borrowers */}
                <Card>
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                    <h2 className="font-semibold">Borrowers</h2>
                    <button className="text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline">View all</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                          <th className="px-5 py-3 font-medium">Borrower</th>
                          <th className="px-3 py-3 font-medium">Amount</th>
                          <th className="px-3 py-3 font-medium">Type</th>
                          <th className="px-3 py-3 font-medium">AI Score</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="px-5 py-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {borrowers.map((b, i) => (
                          <tr key={b.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${i < borrowers.length - 1 ? 'border-b border-gray-50 dark:border-gray-700/40' : ''}`}>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <span className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center font-semibold shrink-0">
                                  {b.name[0]}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{b.name}</p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">{b.loanId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3.5">
                              <p className="font-semibold">{b.amount}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{b.months} months</p>
                            </td>
                            <td className="px-3 py-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_CLS[b.type]}`}>{b.type}</span>
                            </td>
                            <td className="px-3 py-3.5">
                              <span className={`text-base font-bold ${SCORE_COLOR[b.score]}`}>{b.score}</span>
                              <span className="text-xs text-gray-400 dark:text-gray-500 ml-1.5">{b.scoreVal}</span>
                            </td>
                            <td className="px-3 py-3.5"><StatusBadge status={b.status} /></td>
                            <td className="px-5 py-3.5 text-right">
                              <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                b.action === 'Disburse'
                                  ? 'bg-violet-600 hover:bg-violet-700 text-white'
                                  : b.action === 'Review'
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25'
                                    : 'border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                              }`}>
                                {b.action}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Actions rapides */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {quickActions.map(({ label, icon: Icon }) => (
                    <Card key={label} className="!shadow-none hover:!shadow-md hover:border-violet-300 dark:hover:border-violet-500/40 cursor-pointer transition-all group">
                      <div className="flex flex-col items-center justify-center gap-2.5 py-5">
                        <span className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                          <Icon size={19} />
                        </span>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Bas : calendrier EMI + collection summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold">EMI Calendar</h2>
                      <div className="flex items-center gap-1 text-sm">
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60"><ChevronLeft size={15} /></button>
                        <span className="font-medium capitalize px-1">{today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60"><ChevronRight size={15} /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                        <div key={i} className="text-[11px] font-medium text-gray-400 dark:text-gray-500 py-1">{d}</div>
                      ))}
                      {cells.map((day, i) => (
                        <div key={i} className={`relative aspect-square flex items-center justify-center text-xs rounded-lg ${
                          day === today.getDate()
                            ? 'bg-violet-600 text-white font-semibold'
                            : day ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 cursor-default' : ''
                        }`}>
                          {day || ''}
                          {day && day !== today.getDate() && EMI_DUE_DAYS.includes(day) && (
                            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-500" />
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mt-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> EMI due dates
                    </p>
                  </Card>

                  <Card className="p-5">
                    <h2 className="font-semibold mb-1">Collection Summary</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">This week (in $K)</p>
                    <ResponsiveContainer width="100%" height={210}>
                      <BarChart data={collectionSummary} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false} />
                        <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => `${v}K`} />
                        <Tooltip content={<ChartTooltip unit="K" />} cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }} />
                        <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="overdue" name="Overdue" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Collected</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Overdue</span>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Panneau latéral droit */}
              <div className="space-y-5">
                <Card className="p-5">
                  <h3 className="font-semibold mb-1">Credit Score Distribution</h3>
                  <ResponsiveContainer width="100%" height={130}>
                    <RadialBarChart data={scoreGaugeData} innerRadius="45%" outerRadius="110%"
                      startAngle={180} endAngle={0} barSize={10} cy="75%">
                      <RadialBar dataKey="value" background={{ fill: dark ? '#374151' : '#f3f4f6' }} cornerRadius={6} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 -mt-3">
                    {[...scoreGaugeData].reverse().map(s => (
                      <div key={s.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                          <span className="w-2 h-2 rounded-full" style={{ background: s.fill }} /> {s.name}
                        </span>
                        <span className="font-semibold">{s.value}%</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-5">
                  <h3 className="font-semibold mb-3">Risk Alerts</h3>
                  <div className="space-y-3">
                    {riskAlerts.map((a, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm">
                        <AlertTriangle size={15} className={`shrink-0 mt-0.5 ${a.color}`} />
                        <span className="text-gray-600 dark:text-gray-300 leading-snug">{a.text}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-5">
                  <h3 className="font-semibold mb-4">Today's Activity</h3>
                  <div className="space-y-0">
                    {activity.map((a, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                          {i < activity.length - 1 && <span className="w-px flex-1 bg-gray-200 dark:bg-gray-700" />}
                        </div>
                        <div className="pb-4">
                          <p className="text-sm text-gray-600 dark:text-gray-300 leading-snug">{a.text}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{a.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
