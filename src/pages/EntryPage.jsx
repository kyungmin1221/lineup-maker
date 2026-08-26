import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ensureSignedIn } from '../firebase/auth';
import {
  createLineup,
  findMyLineups,
} from '../firebase/lineupService';
import { makeQuarter, C } from '../constants';
import { trackEvent } from '../lib/analytics';
import Onboarding from '../components/Onboarding';

const CACHE_KEY = 'lineup-maker:my-lineup-id';
const ONBOARDED_KEY = 'lineup-maker:onboarded';

function buildEmptyLineup() {
  const quarter = makeQuarter('1쿼터', []);
  return {
    teamName: '',
    squad: [],
    quarters: [{ ...quarter, formations: { base: '4-3-3' } }],
  };
}

export default function EntryPage() {
  const navigate = useNavigate();
  const ran = useRef(false);
  const [showOnboarding, setShowOnboarding] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(ONBOARDED_KEY) !== 'true'
  );

  useEffect(() => {
    // 온보딩 진행 중이면 라우팅 대기
    if (showOnboarding) return;
    // StrictMode 이중 실행 방지
    if (ran.current) return;
    ran.current = true;

    // 기존 사용자: 캐시된 ID로 바로 이동 (Firestore 호출 없음)
    const cachedId = localStorage.getItem(CACHE_KEY);
    if (cachedId) {
      navigate(`/edit/${cachedId}`, { replace: true });
      return;
    }

    // 신규 사용자: 로그인 후 라인업 생성
    (async () => {
      try {
        const uid = await ensureSignedIn();

        const items = await findMyLineups(uid);
        if (items.length > 0) {
          localStorage.setItem(CACHE_KEY, items[0].id);
          navigate(`/edit/${items[0].id}`, { replace: true });
          return;
        }

        const emptyLineup = buildEmptyLineup();
        const newId = await createLineup(emptyLineup, uid);
        trackEvent('create_lineup', { trigger: 'auto_first_visit' });
        localStorage.setItem(CACHE_KEY, newId);
        // 방금 만든 데이터를 그대로 넘겨서, CreatePage가 같은 문서를
        // 또 조회하는 불필요한 Firestore 왕복을 건너뛰게 함
        navigate(`/edit/${newId}`, {
          replace: true,
          state: { initialData: { ...emptyLineup, id: newId, ownerId: uid } },
        });
      } catch (err) {
        console.error(err);
      }
    })();
  }, [navigate, showOnboarding]);

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDED_KEY, 'true');
    trackEvent('onboarding_complete');
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: C.muted }}>준비 중...</div>
    </div>
  );
}
