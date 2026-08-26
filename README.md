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

## 팀(라커룸) 관리

- **라커룸** — 선수단을 저장해두는 팀 단위 공간. 라인업을 만들 때 라커룸에서 선수 명단을 가져오면 그 라인업이 자동으로 해당 팀에 연결됨(`teamId`)
- **경기 기록** — 라인업 편집 화면의 "경기 기록" 섹션에서 선수별 출석(출석/지각/결석 팝업 선택)·골·도움·MVP를 기록. 라인업 소유자뿐 아니라 편집 링크 보유자도 입력 가능
- **팀 통계** — 라커룸의 "기록" 탭에서 선수별 골·도움·출석·MVP 합계를 확인하고, 4개 기준(골/도움/출석/MVP)으로 정렬해 순위로 볼 수 있음
- **실시간 동기화** — 라커룸 정보, 소속 라인업 목록, 기록 통계 모두 Firestore 실시간 구독이라 새로고침 없이 반영됨
- **관리자 초대** — "관리자 초대 링크"를 공유하면 받은 사람이 "합류하기"를 눌러 공동 관리자가 됨(`memberIds`). 라커룸 삭제는 최초 생성자(`ownerId`)만 가능
- **기록 전용 공유** — "공유" 버튼은 다른 탭으로 이동할 수 없고 기록만 보이는 열람 전용 링크(`?tab=stats`)를 생성 — 팀원에게 부담 없이 공유하기 위함
- **총합 직접 보정** — 관리자는 팀 통계 화면에서 어느 경기인지 따지지 않고 선수의 골/도움/출석/지각/결석/MVP 총합을 그 자리에서 바로 조정 가능(경기 수가 많아져도 화면 크기가 늘어나지 않음)
- **삭제해도 기록은 보존** — 라인업을 삭제해도 그 안에 있던 기록은 라커룸에 보관(`archivedRecord`)되어 팀 통계에서 빠지지 않음

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
/                 진입점 — 기존 라인업으로 이동하거나 신규 생성 후 리다이렉트
/my               내 라인업·라커룸 목록 — 생성·삭제·선택
/edit/:id         라인업 편집 (소유자 또는 편집 토큰 보유자)
/view/:id         라인업 보기 (읽기 전용, 댓글 작성 가능)
/locker-room/:id  라커룸(팀) — 선수단/라인업/기록 3탭
                  ?tab=stats로 열면 기록만 보이는 공유 전용 뷰
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

## 데이터 모델 메모

- `lineups/{id}`
  - `teamId`: 소속 라커룸 id (없으면 미분류 라인업)
  - `record`: `{ attendance: { [playerId]: 'present'|'late'|'absent' }, goals: { [playerId]: n }, assists: { [playerId]: n }, mvpPlayerId }`
- `lockerRooms/{id}`
  - `ownerId`: 최초 생성자 (삭제 권한 보유자)
  - `memberIds`: 합류한 관리자들의 uid 배열 (생성자 포함, 편집 권한 보유자)
  - `archivedRecord`: `{ [playerId]: { present, late, absent, goals, assists, mvpCount } }` — 삭제된 라인업의 기록 보존 + 관리자의 총합 직접 보정값을 함께 담는 오프셋 저장소
- 관련 로직: `src/lib/teamStats.js`(집계·보정), `src/lib/recordEdits.js`(기록 갱신 순수 함수), `src/components/MatchRecord.jsx`(기록 입력 UI)

## 다음 단계 (TODO)

### 1. `/my` 첫 화면을 팀 중심으로 재구성 — 미착수
원래 목표는 `/my`에 들어가면 "나의 라인업" 목록이 아니라 **내가 관리하는 팀(라커룸) 목록**이 먼저 보이고, 그 팀 안에서 라인업을 만드는 흐름이었습니다. 지금은 팀·기록 관련 기능은 다 만들었지만, `/my`의 화면 구성 자체는 아직 "나의 라인업"이 먼저 나오고 "라커룸"이 그 아래 별도 섹션으로 있는 예전 구조 그대로입니다. `src/pages/MyLineupsPage.jsx`의 레이아웃 순서/CTA를 재배치하는 작업이 남아있습니다.

### 2. 관리자 권한 — 지금은 링크 기반 "가벼운" 버전
지금 구현된 관리자 합류(`memberIds`)는 실제 신원 확인 없이, **초대 링크를 아는 사람이면 누구나** "합류하기"로 관리자가 될 수 있는 구조입니다(대신 삭제는 생성자만 가능). "진짜 이 사람만 관리자로 지정"하고 싶다면 익명 인증이 아니라 실제 토스 로그인 기반 신원 확인이 필요한데, 이건 서버 인프라가 선행돼야 해서 별도 작업으로 남겨뒀습니다.

**왜 서버가 필요한가**: `@apps-in-toss/web-bridge`의 `appLogin()`은 클라이언트에서 `authorizationCode`만 돌려줍니다(`node_modules/@apps-in-toss/web-bridge/dist/appLogin.d.ts`). 이 코드를 실제 사용자 식별값(`userKey`)으로 바꾸려면 mTLS 인증서로 인증하는 서버 API("사용자 정보 받기", `GET /api-partner/v1/apps-in-toss/user/oauth2/login/me`)를 호출해야 하는데, 브라우저에서 직접 호출이 불가능해 반드시 서버(Cloud Functions 등)가 필요합니다. 아래 3번 푸시 알림과 정확히 같은 인프라를 공유하므로 같이 진행하는 게 효율적입니다.

**사전 준비물 (콘솔 작업 — 코드로 대신할 수 없음)**
- [ ] 토스 파트너 콘솔에서 **토스 로그인** 활성화 (`oauth2ClientId` 발급/설정)
- [ ] **mTLS 클라이언트 인증서** 발급 (로그인 사용자 정보 조회·푸시 메시지 발송 공용)

**착수 시 구현 범위**
- Firebase Cloud Functions 신설 (mTLS 인증서는 Secret Manager 보관 + `https.Agent`)
- `appLogin()` → `authorizationCode` → 서버에서 `userKey`로 교환하는 엔드포인트
- 기존 Firebase Anonymous Auth와 병행할지 대체할지 결정 필요 (열람만 하는 사람은 로그인 없이 유지하고 "관리자가 되려는 사람만 로그인"하는 쪽이 유력)
- `memberIds`를 `userKey` 기반으로 전환 (지금의 익명 uid 배열을 대체)

### 3. 푸시 알림 — 미착수
댓글 알림 등. 위 2번과 같은 서버/mTLS 인프라가 선행 조건이라 함께 진행 예정. 메시지 템플릿 등록·문구 심사도 리드타임이 있어 미리 신청해두는 게 유리합니다.
