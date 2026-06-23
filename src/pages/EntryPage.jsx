import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ensureSignedIn } from '../firebase/auth';
import {
  createLineup,
  findMyLineups,
  getLineup,
  updateLineup,
} from '../firebase/lineupService';
import { makeQuarter, C } from '../constants';
import { trackEvent } from '../lib/analytics';

const CACHE_KEY = 'lineup-maker:my-lineup-id';

function buildEmptyLineup() {
  return {
    teamName: '',
    squad: [],
    quarters: [makeQuarter('1쿼터', [])],
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

        // ownerId 없는 옛 라인업이 캐시되어 있으면 본인 것으로 클레임
        const cachedId = localStorage.getItem(CACHE_KEY);
        if (cachedId) {
          const cached = await getLineup(cachedId);
          if (cached && !cached.ownerId) {
            await updateLineup(cachedId, { ownerId: uid }).catch(() => {});
          }
        }

        const items = await findMyLineups(uid);

        if (items.length > 0) {
          // 가장 최근 라인업으로 직행
          navigate(`/edit/${items[0].id}`, { replace: true });
          return;
        }

        // 신규 사용자: 빈 라인업 자동 생성 후 직행
        const newId = await createLineup(buildEmptyLineup(), uid);
        trackEvent('create_lineup', { trigger: 'auto_first_visit' });
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
