# 🎂 오늘의 케이크 (Today's Cake)
> **1인 수제 케이크 아뜰리에를 위한 모바일 문의·주문 접수 웹앱**

혼자 케이크를 만드는 1인 사장님이 전화와 인스타그램 DM으로 흩어지는 주문을 한곳에서 누락 없이 접수하고 관리할 수 있도록 설계된 모바일 최적화 웹 애플리케이션입니다.

---

## ⚠️ 앱을 복사(Fork / Clone)한 분이 가장 먼저 해야 할 일

이 프로젝트를 복사하여 본인 매장에 적용할 때는 **아래 4단계를 순서대로 반드시 진행**해야 합니다.

---

### Step 1. 내 Firebase 프로젝트로 새로 연결하기 🚨 (가장 중요!)
> **주의:** 이 설정을 하지 않고 그대로 실행하거나 배포하면, **손님들이 남긴 문의와 주문서가 원본 제작자의 데이터베이스로 전송**됩니다!

1. [Firebase Console](https://console.firebase.google.com/)에 접속하여 새 프로젝트를 생성합니다.
2. **Authentication(인증)** 메뉴로 이동하여 **'Google'** 로그인 제공업체를 활성화합니다.
3. **Firestore Database** 메뉴로 이동하여 데이터베이스를 생성합니다 (프로덕션 모드 권장).
4. 프로젝트 개요 옆의 설정(톱니바퀴) > **프로젝트 설정** > 내 앱 섹션에서 **웹 앱(`</>`)**을 추가합니다.
5. 발급된 `firebaseConfig` 객체 정보를 프로젝트 루트의 `firebase-applet-config.json`에 붙여넣습니다.

```json
{
  "apiKey": "본인의_API_KEY",
  "authDomain": "본인프로젝트.firebaseapp.com",
  "projectId": "본인_PROJECT_ID",
  "storageBucket": "본인프로젝트.appspot.com",
  "messagingSenderId": "본인_SENDER_ID",
  "appId": "본인_APP_ID"
}
```

---

### Step 2. 사장 이메일(OWNER_EMAIL)을 내 Gmail로 바꾸기

사장님 화면 접속 권한 및 데이터베이스 보안 규칙에 본인의 구글 이메일을 등록해야 합니다.

1. **`src/firebase.ts`** 상단
   ```ts
   // 복사했다면 이 주소를 내 Gmail로 바꾸세요
   export const OWNER_EMAIL = 'your-email@gmail.com'; // 👈 본인 Gmail로 변경
   ```

2. **`firestore.rules`** 파일
   ```rules
   // 복사했다면 이 주소를 내 Gmail로 바꾸세요
   function isOwner() {
     return request.auth != null && request.auth.token.email == 'your-email@gmail.com'; // 👈 동일한 본인 Gmail로 변경
   }
   ```
3. 수정한 보안 규칙을 Firebase에 배포합니다:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

### Step 3. 가게 이름 · 주소 · 전화번호 · 계좌번호 바꾸기

코드 내의 예시 정보를 실제 매장 정보로 변경합니다:

| 항목 | 수정 파일 위치 | 기본 예시값 |
| :--- | :--- | :--- |
| **전화번호** | `src/OrderForm.tsx`, `src/OrderCompleted.tsx` | `010-0000-0000` |
| **매장 주소** | `src/OrderForm.tsx`, `src/OrderCompleted.tsx` | `서울시 ○○구 ○○동 (예시 주소)` |
| **입금 계좌** | `src/OwnerDashboard.tsx` (`sendSmsAccount` 함수) | `○○은행 000-0000-0000 (예시)` |
| **케이크 종류/가격** | `src/OrderForm.tsx`, `src/types.ts` | 도시락(1.9만~), 1호(3.8만~), 2호(4.8만~) |

---

### Step 4. Vercel 배포 후 Firebase '승인된 도메인'에 주소 추가하기

1. GitHub 저장소에 코드를 푸시하고 [Vercel](https://vercel.com/) 또는 선호하는 호스팅 서비스에 배포합니다.
2. 배포 완료 후 발급된 실제 서비스 도메인(예: `https://your-cake-shop.vercel.app`)을 복사합니다.
3. [Firebase Console](https://console.firebase.google.com/) > **Authentication** > **설정(Settings)** 탭 > **승인된 도메인(Authorized domains)**으로 이동합니다.
4. **'도메인 추가'**를 누르고 복사한 도메인 주소를 등록합니다.
   > **안내:** 승인된 도메인에 등록하지 않으면 사장님 로그인(Google OAuth 팝업) 시 `auth/unauthorized-domain` 에러가 발생합니다.

---

## 💡 주요 기능

- **손님용 모바일 단일 주문 페이지 (`OrderForm`)**
  - 회원가입/로그인 없는 비회원 3분 간편 접수
  - 최소 2일 전 예약 픽업 날짜 및 30분 단위 방문 시간 선택
  - 주문서 / 일정 문의 / 기타 상담 3가지 양식 자동 전환
  - 케이크 크기, 맛, 레터링(15자 제한) 입력
  - 디자인 참고 사진 첨부 시 **가로 1000px 이하 자동 리사이징 & JPEG 500KB 이하 압축** (초과 시 차단 안내)
- **접수 완료 화면 (`OrderCompleted`)**
  - 고유 접수 번호(`#C-YYMMDD-XXXXXX`) 발급 및 접수 내역 요약
  - 사장님 작업 안내 및 픽업 매장 위치 안내
- **사장님 주문 대장 대시보드 (`OwnerDashboard`)**
  - 손님이 남긴 주문/문의를 **Firestore 실시간 스트림**으로 즉각 수신
  - 상태 즉시 변경 (접수대기 / 확인중 / 확정완료)
  - 입금 안내 문자 및 답변 문자 1클릭 템플릿 발송 (`sms:`)
  - 첨부 사진 원본 확대 모달 보기

---

## 🛠️ 기술 스택

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Database & Auth**: Firebase Cloud Firestore, Firebase Authentication (Google Auth)
- **Icons**: Google Material Symbols Outlined
