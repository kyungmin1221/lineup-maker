import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ensureSignedIn } from '../firebase/auth';
import { createLineup, findMyLineupId, getLineup } from '../firebase/lineupService';
import { STARTER_SQUAD, STARTER_LAYOUT, makeQuarter } from '../constants';
import { C } from '../constants';

const CACHE_KEY = 'lineup-maker:my-lineup-id';

function buildInitialLineup() {
  return {
    teamName: '매탄동 FC',
    squad: STARTER_SQUAD,
    quarters: [
      makeQuarter('1쿼터', STARTER_LAYOUT.map((p) => ({ ...p }))),
    ],
  };
}

export default function EntryPage() {
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    // StrictMode 이중 실행 방지
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const uid = await ensureSignedIn();

        // 1) localStorage 캐시 확인
        const cachedId = localStorage.getItem(CACHE_KEY);
        if (cachedId) {
          const data = await getLineup(cachedId);
          if (data && data.ownerId === uid) {
            navigate(`/edit/${cachedId}`, { replace: true });
            return;
          }
          localStorage.removeItem(CACHE_KEY);
        }

        // 2) Firestore 조회
        const existingId = await findMyLineupId(uid);
        if (existingId) {
          localStorage.setItem(CACHE_KEY, existingId);
          navigate(`/edit/${existingId}`, { replace: true });
          return;
        }

        // 3) 신규 생성
        const newId = await createLineup(buildInitialLineup(), uid);
        localStorage.setItem(CACHE_KEY, newId);
        navigate(`/edit/${newId}`, { replace: true });
      } catch (err) {
        console.error(err);
      }
    })();
  }, [navigate]);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: C.muted }}>준비 중...</div>
    </div>
  );
}
