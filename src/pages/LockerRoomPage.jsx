import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Check } from 'lucide-react';
import { C, nextId } from '../constants';
import { getLockerRoom, updateLockerRoom } from '../firebase/lockerRoomService';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';

export default function LockerRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [players, setPlayers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const { toast, showToast } = useToast();
  const isFirstLoad = useRef(true);

  useEffect(() => {
    getLockerRoom(id).then((data) => {
      if (!data) { navigate('/my', { replace: true }); return; }
      setName(data.name || '');
      setPlayers(data.players || []);
      setLoaded(true);
    });
  }, [id, navigate]);

  // 선수 목록 자동 저장 (첫 로드 시 제외)
  useEffect(() => {
    if (!loaded) return;
    if (isFirstLoad.current) { isFirstLoad.current = false; return; }
    const timer = setTimeout(() => {
      updateLockerRoom(id, { players }).catch(console.error);
    }, 800);
    return () => clearTimeout(timer);
  }, [id, players, loaded]);

  const handleNameBlur = () => {
    updateLockerRoom(id, { name }).catch(console.error);
  };

  const handleAddPlayer = () => {
    if (!newName.trim()) return;
    setPlayers(prev => [
      ...prev,
      { id: nextId(), name: newName.trim(), number: newNumber.trim() || '-' },
    ]);
    setNewName('');
    setNewNumber('');
  };

  const handleDeletePlayer = (pid) => {
    setPlayers(prev => prev.filter(p => p.id !== pid));
  };

  const handleEditStart = (p) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditNumber(p.number === '-' ? '' : p.number);
  };

  const handleEditDone = () => {
    if (!editName.trim()) return;
    setPlayers(prev => prev.map(p =>
      p.id === editingId
        ? { ...p, name: editName.trim(), number: editNumber.trim() || '-' }
        : p
    ));
    setEditingId(null);
  };

  if (!loaded) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 14, color: C.muted }}>불러오는 중...</div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 24px 60px' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 32 }}>
          <button
            onClick={() => navigate('/my')}
            style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', padding: '4px 0 0', flexShrink: 0, display: 'flex' }}
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              라커룸
            </p>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={e => e.key === 'Enter' && e.target.blur()}
              placeholder="라커룸 이름"
              style={{
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${C.accent}`,
                outline: 'none', fontSize: 24, fontWeight: 800,
                color: C.text, width: '100%', paddingBottom: 2,
              }}
            />
          </div>
        </div>

        {/* 선수단 레이블 */}
        <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          선수단{' '}
          {players.length > 0 && <span style={{ color: C.blueBright }}>{players.length}명</span>}
        </p>

        {/* 선수 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {players.length === 0 && (
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>아직 선수가 없어요. 아래에서 추가하세요.</p>
          )}
          {players.map(p =>
            editingId === p.id ? (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: C.surface, border: `1px solid ${C.accent}`,
                  borderRadius: 12, padding: '8px 12px',
                }}
              >
                <input
                  value={editNumber}
                  onChange={e => setEditNumber(e.target.value)}
                  placeholder="#"
                  style={{
                    width: 36, background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, fontWeight: 700, color: C.blueBright, textAlign: 'center',
                  }}
                />
                <div style={{ width: 1, height: 18, background: C.borderMid, flexShrink: 0 }} />
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEditDone()}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 14, color: C.text,
                  }}
                />
                <button onClick={handleEditDone} style={{ background: 'none', border: 'none', color: C.blueBright, cursor: 'pointer', display: 'flex', padding: 4 }}>
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                key={p.id}
                onClick={() => handleEditStart(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 12, padding: '12px 16px',
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.borderMid}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: C.raised, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: C.blueLight,
                }}>
                  {p.number || '-'}
                </span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: C.text }}>{p.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); handleDeletePlayer(p.id); }}
                  style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', padding: 4 }}
                >
                  <X size={14} />
                </button>
              </div>
            )
          )}
        </div>

        {/* 선수 추가 폼 */}
        <div style={{
          display: 'flex', alignItems: 'center',
          borderRadius: 12, background: C.surface, border: `1px solid ${C.border}`,
          overflow: 'hidden', paddingLeft: 12,
        }}>
          <input
            value={newNumber}
            onChange={e => setNewNumber(e.target.value)}
            placeholder="#"
            style={{
              width: 36, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 13, fontWeight: 700, color: C.blueBright, textAlign: 'center',
            }}
          />
          <div style={{ width: 1, height: 20, background: C.border, flexShrink: 0 }} />
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddPlayer()}
            placeholder="선수 이름 입력"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              padding: '13px 10px', fontSize: 14, color: C.text,
            }}
          />
          <button
            onClick={handleAddPlayer}
            style={{
              width: 46, height: 46, background: C.blue, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <Plus size={18} color="#fff" />
          </button>
        </div>

        <p style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 16 }}>
          선수를 탭하면 수정할 수 있어요 · 자동 저장됩니다
        </p>
      </div>
      <Toast message={toast} />
    </div>
  );
}
