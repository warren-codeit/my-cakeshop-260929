import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { db, auth, googleProvider, OWNER_EMAIL } from './firebase';
import { CakeOrder, OrderStatus } from './types';

interface OwnerDashboardProps {
  onBackToCustomer: () => void;
}

const getFutureDateString = (daysAhead: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getDemoOrders = (): CakeOrder[] => {
  const now = Date.now();
  const todayStr = getFutureDateString(0).replace(/-/g, '').slice(2);
  return [
    {
      id: 'demo-order-1',
      orderNumber: `#C-${todayStr}-DM01`,
      intent: 'order',
      customerName: '김지수',
      customerPhone: '010-1234-5678',
      pickupDate: getFutureDateString(2), // 오늘부터 2일 뒤
      pickupTime: '15:30',
      cakeSize: '1호',
      cakeFlavor: '생딸기 생크림',
      letteringText: 'Happy Birthday Jisoo ❤️',
      priceEstimate: 38000,
      status: '접수대기',
      createdAt: now - 1000 * 60 * 18, // 18분 전 접수
      notes: '초 기본 5개 챙겨주세요! 보냉백(+1,000원) 추가 희망합니다.',
    },
    {
      id: 'demo-order-2',
      orderNumber: `#C-${todayStr}-DM02`,
      intent: 'order',
      customerName: '박도현',
      customerPhone: '010-9876-5432',
      pickupDate: getFutureDateString(3), // 오늘부터 3일 뒤
      pickupTime: '18:00',
      cakeSize: '2호',
      cakeFlavor: '발로나 초코 오레오',
      letteringText: '부모님 30주년 축하드려요 ✨',
      priceEstimate: 48000,
      status: '확정완료',
      createdAt: now - 1000 * 60 * 140, // 2시간 20분 전 접수
      notes: '견과류 알레르기가 있어 장식에 견과류 제외 부탁드립니다.',
    },
    {
      id: 'demo-order-3',
      orderNumber: `#C-${todayStr}-DM03`,
      intent: 'schedule',
      customerName: '이서연',
      customerPhone: '010-2468-1357',
      pickupDate: getFutureDateString(5), // 오늘부터 5일 뒤
      pickupTime: '11:00',
      inquiryDetails: '월요일 정기휴무인 것을 보았는데, 혹시 오전 11시에 조기 픽업으로 1호 케이크 1개 수령이 가능할지 문의드립니다!',
      status: '확인중',
      createdAt: now - 1000 * 60 * 60 * 4, // 4시간 전 접수
    },
    {
      id: 'demo-order-4',
      orderNumber: `#C-${todayStr}-DM04`,
      intent: 'consult',
      customerName: '정우진',
      customerPhone: '010-1357-9246',
      pickupDate: getFutureDateString(14), // 오늘부터 14일 뒤
      pickupTime: '14:00',
      inquiryDetails: '회사 창립기념일 답례품으로 큐브 미니케이크 30세트 패키지 단체 주문 및 개별 리본 포장 견적이 궁금하여 상담 남깁니다.',
      status: '접수대기',
      createdAt: now - 1000 * 60 * 60 * 6, // 6시간 전 접수
      notes: '보냉 포장 필수 견적 포함 요청',
    },
  ];
};

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  onBackToCustomer,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [orders, setOrders] = useState<CakeOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'order' | 'schedule' | 'consult'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isOwner = currentUser && currentUser.email === OWNER_EMAIL;
  const canViewDashboard = isOwner || isDemoMode;

  // Subscribe to orders real-time from Firestore when authenticated as owner
  useEffect(() => {
    if (isDemoMode) {
      setOrders(getDemoOrders());
      setLoadingOrders(false);
      return;
    }

    if (!isOwner) {
      setOrders([]);
      return;
    }

    setLoadingOrders(true);
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: CakeOrder[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as CakeOrder);
        });
        setOrders(list);
        setLoadingOrders(false);
      },
      (err) => {
        console.error('Firestore listen error:', err);
        setLoadingOrders(false);
      }
    );

    return () => unsubscribe();
  }, [isOwner, isDemoMode]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      alert(`로그인 실패: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (isDemoMode) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      showTemporaryNotice(`[예시 모드] 상태가 [${newStatus}]으로 변경되었습니다. (화면에서만 변경)`);
      return;
    }

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
      });
      showTemporaryNotice(`상태가 [${newStatus}]으로 변경되었습니다.`);
    } catch (err: any) {
      alert(`상태 변경 실패: ${err.message}`);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (isDemoMode) {
      if (!confirm('정말 이 주문 내역을 삭제하시겠습니까? (예시 모드: 화면에서만 삭제)')) return;
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      showTemporaryNotice('[예시 모드] 주문 내역이 화면에서 삭제되었습니다.');
      return;
    }

    if (!confirm('정말 이 주문 내역을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      showTemporaryNotice('주문 내역이 삭제되었습니다.');
    } catch (err: any) {
      alert(`삭제 실패: ${err.message}`);
    }
  };

  const showTemporaryNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Helper for SMS sending template
  const sendSmsAccount = (order: CakeOrder) => {
    const text = encodeURIComponent(
      `[오늘의 케이크] 안녕하세요 ${order.customerName}님!\n접수번호 ${order.orderNumber} 예약 가능 안내드립니다.\n` +
      `픽업일: ${order.pickupDate} ${order.pickupTime}\n` +
      `금액: ${order.priceEstimate ? order.priceEstimate.toLocaleString() + '원' : '상담 후 안내'}\n` +
      `입금계좌: ○○은행 000-0000-0000 (예시) (예금주: 오늘의케이크)\n` +
      `1~2시간 내 입금 확인 시 예약이 최종 확정됩니다. 감사합니다!`
    );
    window.location.href = `sms:${order.customerPhone}?body=${text}`;
  };

  const sendSmsGeneral = (order: CakeOrder) => {
    const text = encodeURIComponent(
      `[오늘의 케이크] 안녕하세요 ${order.customerName}님!\n남겨주신 문의(접수번호 ${order.orderNumber})에 대해 안내드립니다.\n`
    );
    window.location.href = `sms:${order.customerPhone}?body=${text}`;
  };

  // Filter calculations
  const totalCount = orders.length;
  const pendingCount = orders.filter((o) => o.status === '접수대기').length;
  const inProgressCount = orders.filter((o) => o.status === '확인중').length;
  const completedCount = orders.filter((o) => o.status === '확정완료').length;

  const orderTypeCount = orders.filter((o) => o.intent === 'order').length;
  const scheduleTypeCount = orders.filter((o) => o.intent === 'schedule').length;
  const consultTypeCount = orders.filter((o) => o.intent === 'consult').length;

  const filteredOrders = orders.filter((o) => {
    if (activeFilter !== 'all' && o.intent !== activeFilter) return false;
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    return true;
  });

  const getDDay = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const target = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      target.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'D-Day (오늘)';
      if (diffDays === 1) return 'D-1 (내일)';
      if (diffDays === 2) return 'D-2 (모레)';
      if (diffDays > 0) return `D-${diffDays}`;
      return `D+${Math.abs(diffDays)} (지남)`;
    } catch {
      return '';
    }
  };

  const formatOrderTime = (ts: number) => {
    const now = Date.now();
    const diffMin = Math.floor((now - ts) / (1000 * 60));
    if (diffMin < 1) return '방금 전 접수';
    if (diffMin < 60) return `${diffMin}분 전 접수`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `오늘 ${new Date(ts).getHours().toString().padStart(2, '0')}:${new Date(ts).getMinutes().toString().padStart(2, '0')} 접수`;
    return `${new Date(ts).getMonth() + 1}월 ${new Date(ts).getDate()}일 접수`;
  };

  // Format today's date in Korean
  const todayKorean = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = now.getMonth() + 1;
    const dd = now.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dName = dayNames[now.getDay()];
    return `${yyyy}년 ${mm}월 ${dd}일 (${dName}) · 실시간 접수중`;
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fdf9f3] text-[#725947]">
        <div className="w-10 h-10 border-4 border-[#aa2a49] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-[14px]">인증 정보 확인 중...</p>
      </div>
    );
  }

  // If not logged in or not owner (and not demo mode)
  if (!canViewDashboard) {
    return (
      <div className="flex flex-col w-full min-h-screen bg-[#fdf9f3] max-w-lg mx-auto">
        <header className="sticky top-0 z-40 w-full bg-[#fdf9f3]/90 backdrop-blur-xl border-b border-[#e6e2dc]/60 px-4 h-16 flex items-center justify-between">
          <button
            onClick={onBackToCustomer}
            className="flex items-center gap-1 text-[#725947] hover:text-[#aa2a49] text-[14px] font-bold"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span>손님 화면으로</span>
          </button>
          <span className="text-[16px] font-bold text-[#725947]">사장님 전용 관리</span>
          <div className="w-8"></div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-[#fedcc5] text-[#aa2a49] flex items-center justify-center mb-4 shadow-sm">
            <span className="material-symbols-outlined text-[40px] fill">shield_person</span>
          </div>

          <h1 className="text-[22px] font-bold text-[#1c1c18] mb-2">사장님 전용 로그인</h1>
          <p className="text-[14px] text-[#584143] max-w-xs mb-6 leading-relaxed">
            주문 대장과 접수된 문의 목록은 지정된 사장님 구글 계정으로 로그인 시에만 조회 및 관리가 가능합니다.
          </p>

          {currentUser && !isOwner && (
            <div className="p-3 mb-4 rounded-xl bg-[#ffd9dd] text-[#400012] text-[13px] max-w-xs border border-[#ffb2bc]">
              현재 로그인된 계정(<strong>{currentUser.email}</strong>)은 사장님 권한이 없습니다. 등록된 사장 계정으로 다시 로그인해주세요.
            </div>
          )}

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={handleGoogleLogin}
              className="w-full h-13 rounded-full bg-white border border-[#e6e2dc] shadow-sm text-[#1c1c18] font-bold text-[15px] flex items-center justify-center gap-3 hover:bg-[#f7f3ed] active:scale-95 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Google 계정으로 사장님 로그인</span>
            </button>

            <button
              onClick={() => {
                setIsDemoMode(true);
                setOrders(getDemoOrders());
              }}
              className="w-full h-12 rounded-full bg-[#fedcc5] text-[#785f4d] font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-[#fccca7] active:scale-95 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[20px]">preview</span>
              <span>예시 데이터로 사장님 화면 둘러보기</span>
            </button>

            {currentUser && (
              <button
                onClick={handleLogout}
                className="text-[13px] text-[#8b7073] underline py-1"
              >
                다른 계정으로 전환 (로그아웃)
              </button>
            )}

            <button
              onClick={onBackToCustomer}
              className="w-full h-11 rounded-full bg-[#f1ede7] text-[#725947] font-semibold text-[14px] hover:bg-[#ebe8e2] transition-colors mt-2"
            >
              손님 주문 화면으로 돌아가기
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Render Owner Dashboard
  return (
    <div className="flex flex-col w-full min-h-screen bg-[#fdf9f3] pb-24">
      {/* Top Header matching Stitch screenshot */}
      <header className="sticky top-0 z-40 w-full bg-[#fdf9f3]/95 backdrop-blur-xl border-b border-[#e6e2dc]/60 shadow-[0_1px_8px_rgba(74,53,37,0.05)]">
        <div className="h-16 px-4 flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#fedcc5] text-[#725947] flex-shrink-0">
              <span className="material-symbols-outlined text-[22px]">cake</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[16px] text-[#725947] tracking-tight">오늘의 케이크</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#ffd9dd] text-[#aa2a49] text-[10px] font-bold">
                  {isDemoMode ? '예시 모드' : '주문·예약'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span className="text-[#625b50]">예약 접수중</span>
                <span className="text-[#8b7073]/40">•</span>
                <span className="text-[#aa2a49] font-medium">Cake Atelier</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onBackToCustomer}
              title="손님 화면으로"
              className="w-10 h-10 flex items-center justify-center rounded-full text-[#725947] hover:bg-[#ebe8e2] transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">storefront</span>
            </button>
            {isDemoMode ? (
              <button
                onClick={() => setIsDemoMode(false)}
                title="로그인 화면으로 이동"
                className="px-2.5 py-1.5 rounded-full bg-[#fedcc5] text-[#785f4d] text-[12px] font-bold hover:bg-[#fccca7] transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                <span>로그인하기</span>
              </button>
            ) : (
              <button
                onClick={handleLogout}
                title="로그아웃"
                className="w-10 h-10 flex items-center justify-center rounded-full text-[#725947] hover:bg-[#ebe8e2] transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Demo Mode Alert Banner */}
      {isDemoMode && (
        <div className="sticky top-16 z-30 w-full bg-[#aa2a49] text-white py-2.5 px-4 text-center shadow-md flex items-center justify-center gap-1.5 font-bold text-[13px] tracking-tight">
          <span className="material-symbols-outlined text-[18px]">info</span>
          <span>예시 데이터입니다. 실제 문의는 사장 Gmail로 로그인해야 보입니다</span>
        </div>
      )}

      {/* Main Content */}
      <main className="flex flex-col w-full max-w-lg mx-auto px-4 pt-4 gap-4">
        {/* Date & Title Header */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-[12px] text-emerald-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{todayKorean()}</span>
            </div>
            <h1 className="text-[24px] font-extrabold text-[#1c1c18] mt-0.5">
              접수된 문의·주문 대장
            </h1>
          </div>
          <button
            onClick={() => {
              if (isDemoMode) {
                setOrders(getDemoOrders());
                showTemporaryNotice('예시 데이터가 오늘 기준으로 초기화되었습니다.');
              } else {
                window.location.reload();
              }
            }}
            title="새로고침"
            className="w-10 h-10 rounded-full bg-white border border-[#e6e2dc] flex items-center justify-center text-[#725947] hover:bg-[#f1ede7] transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
        </div>

        {/* Real-time Notification Banner */}
        {pendingCount > 0 ? (
          <div className="p-3.5 rounded-xl bg-[#ffd9dd] text-[#400012] flex items-center justify-between border border-[#ffb2bc] shadow-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#aa2a49] text-[20px]">notifications_active</span>
              <span className="text-[13px] font-medium">새로운 예약 문의가 대기 중입니다!</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-[#aa2a49] text-white text-[11px] font-bold">
              {pendingCount}건 미확인
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#e6e2dc]/50 text-[#625b50] flex items-center gap-2 text-[13px]">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>모든 접수 건이 확인 완료되었습니다. 수고하셨어요!</span>
          </div>
        )}

        {/* Temporary toast */}
        {actionNotice && (
          <div className="p-3 bg-[#aa2a49] text-white text-[13px] font-semibold rounded-xl text-center shadow-md animate-fade-in">
            {actionNotice}
          </div>
        )}

        {/* KPI Counter Cards */}
        <div className="grid grid-cols-4 gap-2">
          <div
            onClick={() => setStatusFilter('all')}
            className={`p-3 rounded-xl bg-white border text-center cursor-pointer transition-all ${
              statusFilter === 'all' ? 'border-[#725947] ring-2 ring-[#725947]/20 shadow-xs' : 'border-[#e6e2dc]'
            }`}
          >
            <span className="text-[11px] text-[#625b50] font-medium">전체</span>
            <div className="text-[22px] font-extrabold text-[#1c1c18]">{totalCount}</div>
          </div>
          <div
            onClick={() => setStatusFilter('접수대기')}
            className={`p-3 rounded-xl bg-white border text-center cursor-pointer transition-all ${
              statusFilter === '접수대기' ? 'border-[#aa2a49] ring-2 ring-[#aa2a49]/20 shadow-xs' : 'border-[#e6e2dc]'
            }`}
          >
            <span className="text-[11px] text-[#aa2a49] font-bold">접수대기</span>
            <div className="text-[22px] font-extrabold text-[#aa2a49]">{pendingCount}</div>
          </div>
          <div
            onClick={() => setStatusFilter('확인중')}
            className={`p-3 rounded-xl bg-white border text-center cursor-pointer transition-all ${
              statusFilter === '확인중' ? 'border-[#725947] ring-2 ring-[#725947]/20 shadow-xs' : 'border-[#e6e2dc]'
            }`}
          >
            <span className="text-[11px] text-[#725947] font-medium">확인중</span>
            <div className="text-[22px] font-extrabold text-[#725947]">{inProgressCount}</div>
          </div>
          <div
            onClick={() => setStatusFilter('확정완료')}
            className={`p-3 rounded-xl bg-white border text-center cursor-pointer transition-all ${
              statusFilter === '확정완료' ? 'border-[#34A853] ring-2 ring-[#34A853]/20 shadow-xs' : 'border-[#e6e2dc]'
            }`}
          >
            <span className="text-[11px] text-emerald-700 font-bold">확정완료</span>
            <div className="text-[22px] font-extrabold text-emerald-800">{completedCount}</div>
          </div>
        </div>

        {/* Intent Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'all'
                ? 'bg-[#725947] text-white shadow-xs'
                : 'bg-white text-[#725947] border border-[#e6e2dc]'
            }`}
          >
            전체보기 ({totalCount})
          </button>
          <button
            onClick={() => setActiveFilter('order')}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'order'
                ? 'bg-[#725947] text-white shadow-xs'
                : 'bg-white text-[#725947] border border-[#e6e2dc]'
            }`}
          >
            🎂 케이크 주문 ({orderTypeCount})
          </button>
          <button
            onClick={() => setActiveFilter('schedule')}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'schedule'
                ? 'bg-[#725947] text-white shadow-xs'
                : 'bg-white text-[#725947] border border-[#e6e2dc]'
            }`}
          >
            📅 일정 문의 ({scheduleTypeCount})
          </button>
          <button
            onClick={() => setActiveFilter('consult')}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'consult'
                ? 'bg-[#725947] text-white shadow-xs'
                : 'bg-white text-[#725947] border border-[#e6e2dc]'
            }`}
          >
            💬 기타 상담 ({consultTypeCount})
          </button>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between text-[12px] text-[#625b50] pt-1">
          <span className="flex items-center gap-1 font-semibold">
            <span className="material-symbols-outlined text-[16px]">sort</span>
            <span>최신 접수순 ▼</span>
          </span>
          <span>정렬 기준: 실시간 Firestore 동기화</span>
        </div>

        {/* Order Cards List */}
        {loadingOrders ? (
          <div className="py-12 flex flex-col items-center justify-center text-[#725947]">
            <div className="w-8 h-8 border-3 border-[#aa2a49] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-[13px]">주문 대장 불러오는 중...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-[#e6e2dc]">
            <span className="text-4xl mb-2">📋</span>
            <p className="text-[15px] font-bold text-[#1c1c18]">해당 조건의 접수 내역이 없습니다</p>
            <p className="text-[13px] text-[#625b50] mt-1">
              손님이 주문서를 제출하면 실시간으로 여기에 자동 기록됩니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredOrders.map((order) => {
              const dDay = getDDay(order.pickupDate);
              const isUrgent = dDay.includes('D-Day') || dDay.includes('D-1') || dDay.includes('D-2');

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-[#e6e2dc] p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden"
                >
                  {/* Card Header: Type badge & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-[#fedcc5] text-[#785f4d] text-[11px] font-bold">
                        {order.intent === 'order'
                          ? '🎂 케이크 주문'
                          : order.intent === 'schedule'
                          ? '📅 일정 문의'
                          : '💬 기타 상담'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          order.status === '접수대기'
                            ? 'bg-[#ffd9dd] text-[#aa2a49]'
                            : order.status === '확인중'
                            ? 'bg-[#e6e2dc] text-[#725947]'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#8b7073]">{formatOrderTime(order.createdAt)}</span>
                  </div>

                  {/* Customer Info row */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f7f3ed] border border-[#e6e2dc]/50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-[#fedcc5] text-[#725947] flex items-center justify-center font-bold text-[15px]">
                        {order.customerName.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[15px] font-bold text-[#1c1c18]">{order.customerName} 님</span>
                          <span className="text-[10px] px-1 py-0.2 rounded bg-white text-[#725947] border border-[#e6e2dc]">
                            {order.orderNumber}
                          </span>
                        </div>
                        <span className="text-[13px] text-[#625b50] font-mono">{order.customerPhone}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${order.customerPhone}`}
                        title="전화 걸기"
                        className="w-9 h-9 rounded-full bg-white border border-[#e6e2dc] flex items-center justify-center text-[#725947] hover:bg-[#ebe8e2] shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[18px]">call</span>
                      </a>
                      <button
                        onClick={() => sendSmsGeneral(order)}
                        title="문자 보내기"
                        className="w-9 h-9 rounded-full bg-white border border-[#e6e2dc] flex items-center justify-center text-[#725947] hover:bg-[#ebe8e2] shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[18px]">chat</span>
                      </button>
                    </div>
                  </div>

                  {/* Pickup date highlight */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#fdf9f3] border border-[#fedcc5]">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[#aa2a49] text-[20px] mt-0.5">event</span>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-[#725947] font-semibold">픽업 희망 일시</span>
                        <span className="text-[16px] font-extrabold text-[#1c1c18]">
                          {order.pickupDate} {order.pickupTime}
                        </span>
                      </div>
                    </div>
                    {dDay && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          isUrgent ? 'bg-[#aa2a49] text-white' : 'bg-[#e6e2dc] text-[#725947]'
                        }`}
                      >
                        {dDay}
                      </span>
                    )}
                  </div>

                  {/* Order Specs (if cake order) */}
                  {order.intent === 'order' && (
                    <div className="flex flex-col gap-2 text-[13px] border-t border-b border-[#e6e2dc]/60 py-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[#625b50]">케이크 구성</span>
                        <span className="font-bold text-[#1c1c18]">{order.cakeSize} (지름 맞춤)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#625b50]">맛 선택</span>
                        <span className="font-semibold text-[#1c1c18]">{order.cakeFlavor}</span>
                      </div>

                      {order.letteringText && (
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="text-[11px] font-bold text-[#aa2a49] flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">edit_note</span>
                            <span>요청 레터링</span>
                          </span>
                          <div className="p-2.5 rounded-xl bg-[#f7f3ed] border border-[#e6e2dc] text-center font-bold text-[15px] text-[#725947]">
                            “ {order.letteringText} ”
                          </div>
                        </div>
                      )}

                      {order.notes && (
                        <div className="flex items-start gap-1.5 text-[12px] text-[#625b50] mt-1 bg-[#fdf9f3] p-2 rounded-lg border border-[#e6e2dc]/60">
                          <span className="material-symbols-outlined text-[14px] text-[#aa2a49] mt-0.5">help</span>
                          <span>추가요청: {order.notes}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inquiry Specs (if schedule or consult) */}
                  {order.intent !== 'order' && (
                    <div className="p-3 rounded-xl bg-[#f7f3ed] border border-[#e6e2dc] text-[13px] leading-relaxed text-[#1c1c18]">
                      <div className="text-[11px] font-bold text-[#aa2a49] mb-1">문의 내용</div>
                      “ {order.inquiryDetails || order.notes || '상세 내용 없음'} ”
                    </div>
                  )}

                  {/* Customer Reference Photo thumbnail */}
                  {order.referenceImage && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#f7f3ed] border border-[#e6e2dc]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={order.referenceImage}
                          alt="고객 참고 사진"
                          className="w-12 h-12 rounded-lg object-cover border border-white shadow-xs"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[12px] font-bold text-[#1c1c18] truncate">고객 디자인 참고 사진</span>
                          <span className="text-[11px] text-[#625b50]">클릭하여 크게 확인하기</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedPhoto(order.referenceImage || null)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-[#e6e2dc] text-[12px] font-bold text-[#725947] hover:bg-[#ebe8e2] shadow-xs flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">visibility</span>
                        <span>보기</span>
                      </button>
                    </div>
                  )}

                  {/* Status Change Buttons matching Stitch */}
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[#625b50] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">sync_alt</span>
                        <span>상태 즉시 변경</span>
                      </span>
                      <span className="font-bold text-[#aa2a49]">현재: {order.status}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(order.id, '접수대기')}
                        className={`h-10 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1 transition-all ${
                          order.status === '접수대기'
                            ? 'bg-[#aa2a49] text-white shadow-sm'
                            : 'bg-[#f1ede7] text-[#725947] hover:bg-[#ebe8e2]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">pending</span>
                        <span>접수</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(order.id, '확인중')}
                        className={`h-10 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1 transition-all ${
                          order.status === '확인중'
                            ? 'bg-[#725947] text-white shadow-sm'
                            : 'bg-[#f1ede7] text-[#725947] hover:bg-[#ebe8e2]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        <span>확인</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(order.id, '확정완료')}
                        className={`h-10 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1 transition-all ${
                          order.status === '확정완료'
                            ? 'bg-[#4c463c] text-white shadow-sm'
                            : 'bg-[#f1ede7] text-[#725947] hover:bg-[#ebe8e2]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">task_alt</span>
                        <span>완료</span>
                      </button>
                    </div>

                    {/* Quick SMS Trigger Button */}
                    {order.intent === 'order' ? (
                      <button
                        type="button"
                        onClick={() => sendSmsAccount(order)}
                        className="w-full h-11 rounded-xl bg-[#725947] text-white text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-[#594231] active:scale-95 transition-all shadow-xs mt-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">receipt</span>
                        <span>
                          입금 계좌 문자 발송 (
                          {order.priceEstimate ? `${order.priceEstimate.toLocaleString()}원` : '상담'})
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => sendSmsGeneral(order)}
                        className="w-full h-11 rounded-xl bg-[#f1ede7] text-[#725947] text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-[#ebe8e2] active:scale-95 transition-all border border-[#e6e2dc] mt-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">chat</span>
                        <span>답변 문자 보내기</span>
                      </button>
                    )}

                    {/* Delete item action */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(order.id)}
                        className="text-[11px] text-[#ba1a1a] hover:underline flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[13px]">delete</span>
                        <span>내역 삭제</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Quick Schedule Widget at Bottom */}
        <div className="p-4 rounded-2xl bg-[#fedcc5]/40 border border-[#fedcc5] flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#fedcc5] text-[#aa2a49] flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">cake</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-[#1c1c18]">
                예약 문의 총 {totalCount}건
              </span>
              <span className="text-[12px] text-[#625b50]">
                접수 대기 {pendingCount}건 · 확정 완료 {completedCount}건
              </span>
            </div>
          </div>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="h-10 px-4 rounded-xl bg-[#725947] text-white text-[13px] font-bold flex items-center gap-1 hover:bg-[#594231] transition-all"
          >
            <span>상단 이동</span>
            <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
          </button>
        </div>
      </main>

      {/* Bottom Sticky Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#fdf9f3]/95 backdrop-blur-xl border-t border-[#e6e2dc]/70 shadow-[0_-2px_12px_rgba(74,53,37,0.06)]">
        <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-2">
          <button
            onClick={onBackToCustomer}
            className="flex flex-col items-center justify-center min-w-[56px] h-12 text-[#625b50] hover:text-[#1c1c18] transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">storefront</span>
            <span className="text-[11px] mt-0.5">손님 주문접수</span>
          </button>
          <button
            className="flex flex-col items-center justify-center min-w-[56px] h-12 text-[#aa2a49] font-bold"
          >
            <span className="material-symbols-outlined text-[24px] fill">shield_person</span>
            <span className="text-[11px] mt-0.5">사장님화면</span>
          </button>
        </div>
      </nav>

      {/* Full Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-sm w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-2">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <img
              src={selectedPhoto}
              alt="고객 참고 사진 확대"
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />
            <div className="p-3 text-center text-[13px] text-[#625b50]">
              손님이 첨부한 디자인 참고 사진입니다.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
