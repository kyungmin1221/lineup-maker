import { C } from '../constants';

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      padding: '10px 20px', borderRadius: 99,
      background: C.blue, color: '#fff',
      fontSize: 14, fontWeight: 600,
      boxShadow: `0 4px 24px ${C.blue}55`,
      zIndex: 50, whiteSpace: 'nowrap',
    }}>
      {message}
    </div>
  );
}
