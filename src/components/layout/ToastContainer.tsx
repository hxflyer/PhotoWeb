/**
 * ToastContainer — fixed-position top-right notifications.
 */
import { useEditorStore } from '../../store/editorStore';

export function ToastContainer() {
    const { toasts, removeToast } = useEditorStore();
    if (toasts.length === 0) return null;

    return (
        <div
            data-testid="toast-container"
            style={{
                position: 'fixed',
                top: '16px',
                right: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                zIndex: 9999,
                pointerEvents: 'none',
            }}
        >
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    data-testid={`toast-${toast.id}`}
                    style={{
                        background: toast.type === 'error' ? '#c0392b'
                            : toast.type === 'success' ? '#27ae60'
                            : '#2980b9',
                        color: 'white',
                        padding: '10px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        pointerEvents: 'all',
                        maxWidth: '320px',
                        animation: 'fadeIn 0.2s ease-out',
                    }}
                >
                    <span style={{ flex: 1 }}>{toast.message}</span>
                    <button
                        onClick={() => removeToast(toast.id)}
                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0 2px', fontSize: '16px', lineHeight: 1, opacity: 0.8 }}
                    >
                        x
                    </button>
                </div>
            ))}
        </div>
    );
}
