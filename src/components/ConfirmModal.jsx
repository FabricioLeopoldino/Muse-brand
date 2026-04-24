export default function ConfirmModal({ title, message, onConfirm, onCancel, danger = true }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000
    }}>
      <div style={{
        background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: 28, maxWidth: 400, width: '90%'
      }}>
        <h3 style={{ fontFamily: 'Archivo Black, sans-serif', fontSize: 16, color: '#e8eaf2', marginBottom: 10 }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'rgba(232,234,242,0.6)', marginBottom: 24, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '8px 18px', color: '#e8eaf2', fontSize: 13, cursor: 'pointer', fontWeight: 600
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            background: danger ? '#dc2626' : '#2563eb', border: 'none',
            borderRadius: 8, padding: '8px 18px', color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 600
          }}>Confirm</button>
        </div>
      </div>
    </div>
  )
}
