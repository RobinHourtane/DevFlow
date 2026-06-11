export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="px-10 py-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      style={{ borderBottom: '1px solid var(--border-1)' }}>
      <div>
        {eyebrow && <div className="label-mono mb-3">{eyebrow}</div>}
        <h1 className="font-display text-3xl text-[var(--text-1)]">{title}</h1>
        {description && (
          <p className="text-sm text-[var(--text-2)] mt-2 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
