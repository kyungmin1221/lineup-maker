import { useState } from 'react';
import { Crown, Plus, Minus, ChevronDown } from 'lucide-react';
import { C, ATTENDANCE_OPTIONS, attendanceMeta } from '../constants';

export function AttendancePicker({ status, onSelect, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 20 }} />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 21,
          background: C.raised, border: `1px solid ${C.borderMid}`,
          borderRadius: 10, padding: 6, display: 'flex', gap: 4,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}
      >
        {ATTENDANCE_OPTIONS.map((o) => {
          const active = status === o.key;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onSelect(active ? null : o.key)}
              style={{
                padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                color: o.color, background: active ? `${o.color}25` : 'transparent',
                border: `1px solid ${active ? `${o.color}60` : C.border}`,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

export function Stepper({ label, count, onChange, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 11, color: C.muted }}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(-1)}
        disabled={count === 0}
        style={{
          width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: C.raised, border: `1px solid ${C.border}`, color: count === 0 ? C.muted : C.text,
          cursor: count === 0 ? 'default' : 'pointer', flexShrink: 0,
        }}
      >
        <Minus size={11} />
      </button>
      <span style={{ minWidth: 14, textAlign: 'center', fontSize: 13, fontWeight: 700, color: color || C.text }}>
        {count}
      </span>
      <button
        type="button"
        onClick={() => onChange(1)}
        style={{
          width: 20, height: 20, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: C.raised, border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', flexShrink: 0,
        }}
      >
        <Plus size={11} />
      </button>
    </div>
  );
}

export default function MatchRecord({ squad, record, onSetAttendance, onSetGoals, onSetAssists, onSetMvp, readOnly, quarterLabel, isFirstQuarter = true }) {
  const attendance = record?.attendance || {};
  const goals = record?.goals || {};
  const assists = record?.assists || {};
  const mvpPlayerId = record?.mvpPlayerId ?? null;
  const [openAttendanceFor, setOpenAttendanceFor] = useState(null);
  const [expanded, setExpanded] = useState(false);

  if (!squad || squad.length === 0) return null;

  return (
    <div style={{ padding: '20px 24px 0' }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', gap: 8, marginBottom: expanded ? 16 : 0,
          background: C.surface, border: `1px solid ${expanded ? C.borderMid : C.border}`,
          borderRadius: 12, padding: '12px 16px',
          cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.borderMid; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = expanded ? C.borderMid : C.border; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            {quarterLabel ? `${quarterLabel} 경기 기록` : '경기 기록'}
          </p>
          <span style={{
            fontSize: 11, fontWeight: 600,
            padding: '1px 7px', borderRadius: 99,
            background: `${C.blue}25`, color: C.blueBright,
          }}>
            {squad.length}
          </span>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: C.sub }}>
          {expanded ? '접기' : '펼치기'}
          <ChevronDown
            size={14}
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
          />
        </span>
      </button>

      {expanded && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {squad.map((p) => {
          const isMvp = mvpPlayerId === p.id;
          const goalCount = goals[p.id] || 0;
          const assistCount = assists[p.id] || 0;
          const status = attendance[p.id] ?? null;
          const meta = attendanceMeta(status);

          return (
            <div
              key={p.id}
              style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                background: C.surface, border: `1px solid ${isMvp ? '#f0ad4e60' : C.border}`,
                borderRadius: 12, padding: '10px 12px',
              }}
            >
              {/* 1행: 번호 / 이름 / MVP(1쿼터만) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: C.raised, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: C.blueLight,
                }}>
                  {p.number || '-'}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
                {isFirstQuarter && (
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => onSetMvp(p.id)}
                    aria-label="MVP 지정"
                    title="MVP 지정"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: isMvp ? '#f0ad4e25' : 'transparent',
                      border: `1px solid ${isMvp ? '#f0ad4e60' : 'transparent'}`,
                      color: isMvp ? '#f0ad4e' : C.muted,
                      cursor: readOnly ? 'default' : 'pointer',
                    }}
                  >
                    <Crown size={14} fill={isMvp ? '#f0ad4e' : 'none'} />
                  </button>
                )}
              </div>

              {/* 2행: 출석(1쿼터만) / 골 / 도움 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: isFirstQuarter ? 'space-between' : 'flex-end', gap: 8, paddingLeft: 38 }}>
                {isFirstQuarter && (
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => setOpenAttendanceFor((cur) => (cur === p.id ? null : p.id))}
                      style={{
                        minWidth: 44, padding: '4px 8px', borderRadius: 8,
                        fontSize: 11, fontWeight: 700, color: meta.color,
                        background: `${meta.color}20`, border: `1px solid ${meta.color}40`,
                        cursor: readOnly ? 'default' : 'pointer',
                      }}
                    >
                      {meta.label}
                    </button>
                    {openAttendanceFor === p.id && !readOnly && (
                      <AttendancePicker
                        status={status}
                        onSelect={(next) => { onSetAttendance(p.id, next); setOpenAttendanceFor(null); }}
                        onClose={() => setOpenAttendanceFor(null)}
                      />
                    )}
                  </div>
                )}

                {readOnly ? (
                  <span style={{ fontSize: 12, color: C.sub, flexShrink: 0 }}>
                    {goalCount}골 · {assistCount}도움
                  </span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <Stepper label="골" count={goalCount} onChange={(d) => onSetGoals(p.id, d)} color={C.blueBright} />
                    <Stepper label="도움" count={assistCount} onChange={(d) => onSetAssists(p.id, d)} color={C.blueLight} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
