import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight,
  Clock, FolderOpen, CheckSquare, Layers, X, AlertTriangle
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, parseISO
} from 'date-fns';
import { fr } from 'date-fns/locale';
import PageHeader from '../components/devflow/PageHeader';
import api from '../lib/api';
import { PROJECT_STATUS_LABEL as STATUS_LABEL, TASK_PRIORITY_LABEL as PRIORITY_LABEL } from '../lib/constants';

// ─── Constantes ──────────────────────────────────────────────────────────────
const TYPE_ICON = {
  project_start:    { icon: FolderOpen, label: 'Début projet',    bg: 'bg-[var(--accent)]/20', text: 'text-[var(--accent)]',  dot: 'bg-[var(--accent)]' },
  project_deadline: { icon: FolderOpen, label: 'Deadline projet', bg: 'bg-[var(--accent)]/20', text: 'text-[var(--accent)]',  dot: 'bg-[var(--accent)]' },
  task:             { icon: CheckSquare, label: 'Tâche',          bg: 'bg-amber-500/20',  text: 'text-amber-400',  dot: 'bg-amber-400' },
  phase:            { icon: Layers,      label: 'Fin de phase',   bg: 'bg-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const parseDate = (d) => (typeof d === 'string' ? parseISO(d) : new Date(d));

function groupEventsByDay(events) {
  const map = {};
  for (const ev of events) {
    const key = format(parseDate(ev.date), 'yyyy-MM-dd');
    if (!map[key]) map[key] = [];
    map[key].push(ev);
  }
  return map;
}

// ─── Composants ──────────────────────────────────────────────────────────────

function EventPill({ event, onClick }) {
  const meta = TYPE_ICON[event.type] || TYPE_ICON.task;
  const isOverdue = event.color === 'red';
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(event); }}
      className={`w-full text-left px-1.5 py-0.5 text-[10px] font-mono truncate border-l-2
        ${isOverdue ? 'border-red-500 bg-red-500/10 text-red-400' : `border-current ${meta.text} ${meta.bg}`}
        hover:opacity-80 transition-opacity`}
    >
      {event.title}
    </button>
  );
}

function DayCell({ date, events, isCurrentMonth, onDayClick, onEventClick, selectedDay }) {
  const isSelected = selectedDay && isSameDay(date, selectedDay);
  const today      = isToday(date);
  const dayKey     = format(date, 'yyyy-MM-dd');
  const dayEvents  = events[dayKey] || [];
  const hasOverdue = dayEvents.some(e => e.color === 'red');
  const visible    = dayEvents.slice(0, 3);
  const overflow   = dayEvents.length - 3;

  return (
    <div
      onClick={() => onDayClick(date)}
      className={`min-h-[90px] p-1.5 border-b border-r border-[var(--border-1)] cursor-pointer transition-colors
        ${!isCurrentMonth ? 'opacity-30' : ''}
        ${isSelected ? 'bg-[var(--accent)]/10' : 'hover:bg-[var(--hover-1)]'}
      `}
    >
      {/* Numéro du jour */}
      <div className="flex items-center justify-between mb-1">
        <span className={`w-6 h-6 flex items-center justify-center text-xs font-mono
          ${today ? 'bg-[var(--accent)] text-[var(--text-1)] font-bold' : isSelected ? 'text-[var(--text-1)]' : 'text-[var(--text-2)]'}
          ${today ? '' : ''}`}
        >
          {format(date, 'd')}
        </span>
        {hasOverdue && <AlertTriangle className="w-3 h-3 text-red-500" />}
      </div>

      {/* Events */}
      <div className="space-y-0.5">
        {visible.map(ev => (
          <EventPill key={ev.id} event={ev} onClick={onEventClick} />
        ))}
        {overflow > 0 && (
          <p className="text-[10px] label-mono pl-1 text-[var(--text-3)]">+{overflow} autres</p>
        )}
      </div>
    </div>
  );
}

function EventDetail({ event, onClose }) {
  const navigate = useNavigate();
  const meta     = TYPE_ICON[event.type] || TYPE_ICON.task;
  const Icon     = meta.icon;
  const isOverdue = event.color === 'red';

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="bg-[var(--bg-1)] border border-[var(--border-2)] p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className={`p-2 ${meta.bg}`}>
          <Icon className={`w-4 h-4 ${meta.text}`} />
        </div>
        <button onClick={onClose} className="text-[var(--text-4)] hover:text-[var(--text-1)] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <p className="label-mono text-[var(--text-3)] mb-1">{meta.label}</p>
        <p className="text-[var(--text-1)] font-medium font-display leading-tight">{event.title}</p>
      </div>

      {isOverdue && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <p className="text-xs text-red-400">En retard</p>
        </div>
      )}

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-[var(--text-2)]">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono text-xs">
            {format(parseDate(event.date), 'd MMMM yyyy', { locale: fr })}
          </span>
        </div>

        {event.client && (
          <div className="flex items-center gap-2 text-[var(--text-2)]">
            <span className="label-mono">Client</span>
            <span className="text-[var(--text-1)] text-xs">{event.client}</span>
          </div>
        )}

        {event.projectName && (
          <div className="flex items-center gap-2 text-[var(--text-2)]">
            <span className="label-mono">Projet</span>
            <span className="text-[var(--text-1)] text-xs">{event.projectName}</span>
          </div>
        )}

        {event.phase && (
          <div className="flex items-center gap-2 text-[var(--text-2)]">
            <span className="label-mono">Phase</span>
            <span className="text-[var(--text-1)] text-xs">{event.phase}</span>
          </div>
        )}

        {event.status && (
          <div className="flex items-center gap-2">
            <span className="label-mono text-[var(--text-3)]">Statut</span>
            <span className="text-xs font-mono text-[var(--text-1)]">{STATUS_LABEL[event.status] || event.status}</span>
          </div>
        )}

        {event.priority && (
          <div className="flex items-center gap-2">
            <span className="label-mono text-[var(--text-3)]">Priorité</span>
            <span className={`text-xs font-mono ${event.priority === 'URGENT' ? 'text-red-400' : event.priority === 'HIGH' ? 'text-orange-400' : 'text-[var(--text-1)]'}`}>
              {PRIORITY_LABEL[event.priority]}
            </span>
          </div>
        )}
      </div>

      {event.type === 'task' && event.taskId && (
        <button
          onClick={() => navigate(`/projects/${event.projectId}?tab=tasks&taskId=${event.taskId}`)}
          className="w-full text-xs label-mono text-amber-400 border border-amber-400/30 py-2 hover:bg-amber-400/10 transition-colors"
        >
          Voir la tâche →
        </button>
      )}
      {event.projectId && (
        <button
          onClick={() => navigate(`/projects/${event.projectId}`)}
          className="w-full text-xs label-mono text-[var(--accent)] border border-[var(--accent)]/30 py-2 hover:bg-[var(--accent)]/10 transition-colors"
        >
          Voir le projet →
        </button>
      )}
    </motion.div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events,       setEvents]       = useState([]);
  const [upcoming,     setUpcoming]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedDay,  setSelectedDay]  = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filter,       setFilter]       = useState('all'); // all | project | task | phase

  const monthKey = format(currentMonth, 'yyyy-MM');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/calendar?month=${monthKey}`);
      setEvents(data.events || []);
      setUpcoming(data.upcoming || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Grille du mois
  const monthStart  = startOfMonth(currentMonth);
  const monthEnd    = endOfMonth(currentMonth);
  const calStart    = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd      = endOfWeek(monthEnd,   { weekStartsOn: 1 });
  const days        = eachDayOfInterval({ start: calStart, end: calEnd });

  const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // Filtre
  const filteredEvents = filter === 'all' ? events
    : events.filter(e => {
        if (filter === 'project') return e.type.startsWith('project');
        if (filter === 'task')    return e.type === 'task';
        if (filter === 'phase')   return e.type === 'phase';
        return true;
      });

  const eventsByDay = groupEventsByDay(filteredEvents);

  // Événements du jour sélectionné
  const dayEvents = selectedDay
    ? (eventsByDay[format(selectedDay, 'yyyy-MM-dd')] || [])
    : [];

  const totalEvents = filteredEvents.length;
  const overdueCount = filteredEvents.filter(e => e.color === 'red').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Planning"
        title="Calendrier"
        description="Deadlines, jalons et tâches de tous vos projets"
        actions={
          <div className="flex items-center gap-2">
            {[
              { id: 'all',     label: 'Tout' },
              { id: 'project', label: 'Projets' },
              { id: 'task',    label: 'Tâches' },
              { id: 'phase',   label: 'Phases' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 text-xs label-mono transition-colors border
                  ${filter === f.id
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--text-1)]'
                    : 'border-[var(--border-3)] text-[var(--text-2)] hover:border-[var(--border-3)]'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI bar */}
      <div className="flex items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[var(--accent)]" />
          <span className="label-mono text-[var(--text-2)]">{totalEvents} événements</span>
        </div>
        {overdueCount > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-red-500" />
            <span className="label-mono text-red-500">{overdueCount} en retard</span>
          </div>
        )}
        <div className="flex items-center gap-4 ml-auto">
          {[
            { dot: 'bg-[var(--accent)]', label: 'Projets' },
            { dot: 'bg-amber-400', label: 'Tâches' },
            { dot: 'bg-purple-500', label: 'Phases' },
            { dot: 'bg-red-500',   label: 'Retard' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${l.dot}`} />
              <span className="label-mono text-[var(--text-3)]">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4 items-start">
        {/* ── Calendrier ──────────────────────────────────────────────────── */}
        <div className="border border-[var(--border-2)] bg-[var(--bg-1)]">
          {/* Navigation mois */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-2)]">
            <button
              onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              className="p-1.5 hover:bg-[var(--bg-3)] transition-colors text-[var(--text-2)] hover:text-[var(--text-1)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <h2 className="font-display text-[var(--text-1)] font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: fr })}
            </h2>

            <button
              onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="p-1.5 hover:bg-[var(--bg-3)] transition-colors text-[var(--text-2)] hover:text-[var(--text-1)]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 border-b border-[var(--border-2)]">
            {WEEK_DAYS.map(d => (
              <div key={d} className="py-2 text-center label-mono text-[var(--text-4)]">
                {d}
              </div>
            ))}
          </div>

          {/* Grille */}
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {days.map(day => (
                <DayCell
                  key={day.toISOString()}
                  date={day}
                  events={eventsByDay}
                  isCurrentMonth={isSameMonth(day, currentMonth)}
                  onDayClick={(d) => { setSelectedDay(d); setSelectedEvent(null); }}
                  onEventClick={setSelectedEvent}
                  selectedDay={selectedDay}
                />
              ))}
            </div>
          )}

          {/* Bouton aujourd'hui */}
          <div className="flex justify-center py-2 border-t border-[var(--border-2)]">
            <button
              onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }}
              className="label-mono text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
            >
              Aujourd'hui
            </button>
          </div>
        </div>

        {/* ── Panneau latéral ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Détail événement sélectionné */}
          <AnimatePresence mode="wait">
            {selectedEvent && (
              <EventDetail
                key={selectedEvent.id}
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
              />
            )}
          </AnimatePresence>

          {/* Événements du jour sélectionné */}
          {selectedDay && !selectedEvent && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-[var(--border-2)] bg-[var(--bg-1)] p-4"
            >
              <p className="label-mono text-[var(--text-3)] mb-3 capitalize">
                {format(selectedDay, 'd MMMM yyyy', { locale: fr })}
              </p>
              {dayEvents.length === 0 ? (
                <p className="text-[var(--text-4)] text-sm">Aucun événement ce jour.</p>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map(ev => {
                    const meta = TYPE_ICON[ev.type] || TYPE_ICON.task;
                    const Icon = meta.icon;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className={`w-full flex items-start gap-3 p-2.5 border text-left hover:border-[var(--border-3)] transition-colors
                          ${ev.color === 'red' ? 'border-red-500/30 bg-red-500/5' : 'border-[var(--border-2)] hover:bg-[var(--bg-2)]'}`}
                      >
                        <div className={`p-1.5 mt-0.5 shrink-0 ${meta.bg}`}>
                          <Icon className={`w-3 h-3 ${meta.text}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-[var(--text-1)] truncate font-medium">{ev.title}</p>
                          <p className="label-mono text-[var(--text-3)] mt-0.5">
                            {ev.projectName || ev.client || meta.label}
                          </p>
                        </div>
                        {ev.color === 'red' && (
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Deadlines à venir (30 jours) */}
          <div className="border border-[var(--border-2)] bg-[var(--bg-1)] p-4">
            <p className="label-mono text-[var(--text-3)] mb-3">Deadlines à venir</p>
            {upcoming.length === 0 ? (
              <p className="text-[var(--text-4)] text-sm">Aucune deadline dans les 30 jours.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map(p => {
                  const deadline = parseDate(p.endDate);
                  const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
                  const urgent   = daysLeft <= 7;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-start justify-between gap-2 p-2 border
                        ${urgent ? 'border-orange-500/30 bg-orange-500/5' : 'border-[var(--border-2)]'}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--text-1)] truncate">{p.name}</p>
                        <p className="label-mono text-[var(--text-3)] mt-0.5">
                          {format(deadline, 'd MMM', { locale: fr })}
                        </p>
                      </div>
                      <span className={`label-mono shrink-0 text-xs px-2 py-0.5
                        ${urgent ? 'text-orange-400 bg-orange-500/10' : 'text-[var(--text-2)]'}`}>
                        {daysLeft}j
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Légende */}
          <div className="border border-[var(--border-2)] bg-[var(--bg-1)] p-4">
            <p className="label-mono text-[var(--text-3)] mb-3">Légende</p>
            <div className="space-y-2">
              {[
                { dot: 'bg-[var(--accent)]', label: 'Début / deadline projet' },
                { dot: 'bg-amber-400', label: 'Tâche due' },
                { dot: 'bg-purple-500', label: 'Fin de phase' },
                { dot: 'bg-red-500',   label: 'En retard' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${l.dot}`} />
                  <span className="text-xs text-[var(--text-2)]">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
