// Shared SliderRow used by every filter's renderUI plus the simpler
// adjustment-dialog rows. Renders a label + range slider + numeric input on a
// fixed three-column grid so adjustment + filter dialogs feel identical.

interface SliderRowProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
    onChange: (value: number) => void;
    testId?: string;
}

const inputStyle: React.CSSProperties = {
    width: 72,
    background: 'hsl(var(--bg-input))',
    border: '1px solid hsl(var(--border-light))',
    borderRadius: 2,
    color: 'hsl(var(--text-main))',
    padding: '3px 5px',
    fontSize: 11,
};

export function SliderRow({ label, value, min, max, step = 1, suffix, onChange, testId }: SliderRowProps) {
    return (
        <label
            data-testid={testId ?? `slider-row-${label.replace(/\s+/g, '-').toLowerCase()}`}
            style={{ display: 'grid', gridTemplateColumns: '110px 1fr 92px', gap: 8, alignItems: 'center', marginBottom: 10 }}
        >
            <span>{label}</span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                style={{ accentColor: 'hsl(var(--accent-primary))' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    style={inputStyle}
                />
                {suffix && <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>{suffix}</span>}
            </div>
        </label>
    );
}
