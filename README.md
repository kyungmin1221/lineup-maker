# Lineup Maker

축구 라인업을 직접 짜고, 링크 하나로 팀원들에게 공유하는 웹 서비스입니다.

## 주요 기능

- **가입 없이 바로 시작** — Firebase 익명 인증으로 즉시 사용 가능
- **라인업 편집** — 축구 필드 위에 선수를 드래그해 자유롭게 배치
- **포메이션 프리셋** — 4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 5-3-2 원클릭 적용
- **쿼터 관리** — 경기 쿼터별 라인업을 각각 구성
- **움직임 모드** — 선수·상대팀·공의 움직임을 단계별로 기록하고 재생
- **시나리오** — 쿼터당 여러 전술 시나리오를 탭으로 관리
- **벤치** — 선수 추가·삭제, 필드↔벤치 이동
- **댓글** — 쿼터별 댓글 작성 및 실시간 동기화
- **공유** — 읽기 전용 뷰 링크 공유 / 편집 링크로 협업 편집
- **자동 저장** — 변경 1초 후 Firestore에 자동 저장

## 기술 스택

| 분류 | 기술 |
|---|---|
| 프레임워크 | React 19 + Vite 8 |
| 라우팅 | React Router DOM v7 |
| 백엔드 | Firebase (Firestore, Anonymous Auth) |
| 스타일 | Tailwind CSS v4 |
| 아이콘 | Lucide React |
| 분석 | Google Analytics |

## 페이지 구조

```
/         진입점 — 기존 라인업으로 이동하거나 신규 생성 후 리다이렉트
/my       내 라인업 목록 — 생성·삭제·선택
/edit/:id 라인업 편집 (소유자 또는 편집 토큰 보유자)
/view/:id 라인업 보기 (읽기 전용, 댓글 작성 가능)
```

## 시작하기

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에 Firebase 프로젝트 정보 입력

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

### 환경 변수

`.env.example`을 참고해 Firebase 콘솔에서 발급한 값을 입력하세요.

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## 배포

- **웹**: Vercel (현재 배포 중)
- **모바일**: App in Toss (예정)
