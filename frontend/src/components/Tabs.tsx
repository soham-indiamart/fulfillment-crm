// Folder-style tab strip, used for the dashboard views and the Summary tables.
interface TabsProps<K extends string> {
  label: string;
  tabs: readonly (readonly [K, string])[];
  active: K;
  onChange: (key: K) => void;
  small?: boolean;
}

export function Tabs<K extends string>({ label, tabs, active, onChange, small = false }: TabsProps<K>) {
  return (
    <div className={`tabs${small ? ' tabs-sm' : ''}`} role="tablist" aria-label={label}>
      {tabs.map(([key, text]) => (
        <button
          key={key}
          type="button"
          role="tab"
          className="tab"
          aria-selected={key === active}
          onClick={() => onChange(key)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
