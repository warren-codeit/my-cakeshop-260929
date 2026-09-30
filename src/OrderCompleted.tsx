import React, { useState } from 'react';
import { CakeOrder } from './types';

interface OrderCompletedProps {
  order: CakeOrder;
  onNewOrder: () => void;
  onOpenOwner: () => void;
}

export const OrderCompleted: React.FC<OrderCompletedProps> = ({
  order,
  onNewOrder,
  onOpenOwner,
}) => {
  const [captured, setCaptured] = useState(false);

  const handleCapture = () => {
    setCaptured(true);
    setTimeout(() => setCaptured(false), 3000);
  };

  const formattedDate = () => {
    if (!order.pickupDate) return '';
    try {
      const parts = order.pickupDate.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const dayName = dayNames[d.getDay()];
        return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일 (${dayName}) ${order.pickupTime}`;
      }
    } catch {
      // fallback
    }
    return `${order.pickupDate} ${order.pickupTime}`;
  };

  const formatCreationTime = (ts: number) => {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
  };

  const maskPhone = (phone: string) => {
    if (phone.length >= 11) {
      return phone.replace(/(\d{3})-\d{3,4}-(\d{4})/, '$1-****-$2');
    }
    return phone;
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#fdf9f3] pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-[#fdf9f3]/90 backdrop-blur-xl border-b border-[#e6e2dc]/60 shadow-[0_1px_8px_rgba(74,53,37,0.05)]">
        <div className="h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onNewOrder}
              aria-label="뒤로 가기"
              className="w-10 h-10 flex items-center justify-center rounded-full text-[#725947] hover:bg-[#ebe8e2] transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <span className="text-[18px] font-bold text-[#725947]">Order Completed</span>
          </div>
          <button
            onClick={onNewOrder}
            aria-label="홈으로"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#725947] hover:bg-[#ebe8e2] transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">home</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex flex-col w-full max-w-lg mx-auto px-4 pt-6 pb-12 gap-5">
        {/* 1. Top Emotional Visual & Completion Header */}
        <section className="flex flex-col items-center text-center pt-2">
          {/* Badge */}
          <div className="relative w-24 h-24 mb-3 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#ffd9dd] rounded-full scale-100 opacity-60 animate-ping"></div>
            <div className="relative w-20 h-20 rounded-full bg-[#fedcc5] flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[44px] text-[#aa2a49] fill">cake</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[#aa2a49] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px] fill">check</span>
            </div>
          </div>

          <h1 className="text-[24px] font-bold text-[#725947] mb-1">
            주문서가 정상 접수되었습니다!
          </h1>
          <p className="text-[15px] text-[#584143] mb-4">
            「오늘의 케이크」에 소중한 날을 맡겨주셔서 감사해요.
          </p>

          {/* Receipt Badge */}
          <div className="w-full bg-[#f7f3ed] border border-[#e6e2dc] rounded-2xl p-4 shadow-xs flex flex-col items-center gap-1">
            <span className="text-[12px] font-medium tracking-wider text-[#725947] uppercase">
              주문 접수 번호
            </span>
            <span className="text-[24px] font-extrabold text-[#aa2a49] tracking-wider font-mono">
              {order.orderNumber}
            </span>
            <span className="text-[13px] text-[#625b50]">
              접수 일시: {formatCreationTime(order.createdAt)}
            </span>
          </div>
        </section>

        {/* 2. Baker's Notice Card */}
        <section className="w-full bg-white rounded-2xl p-4 shadow-sm border border-[#e6e2dc]/70 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#aa2a49]"></div>
          <div className="flex items-start gap-3 pl-1">
            <div className="w-10 h-10 rounded-full bg-[#ffd9dd] flex items-center justify-center flex-shrink-0 text-[#8c1035]">
              <span className="material-symbols-outlined text-[22px]">notifications_active</span>
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <h2 className="text-[16px] font-bold text-[#725947] mb-1.5 flex items-center gap-1">
                <span>사장님이 확인 후 연락드릴게요!</span>
              </h2>
              <div className="space-y-1 text-[14px] text-[#1c1c18] leading-relaxed">
                <p>
                  현재 주방에서 <strong className="text-[#aa2a49] font-bold">신선한 시트를 굽고 아이싱 작업</strong> 중일 수 있습니다.
                </p>
                <p className="text-[#584143] text-[13px]">
                  작업이 마무리되는 대로 <strong className="text-[#1c1c18]">1~2시간 이내</strong>에 예약 가능 여부와 전용 입금 계좌를 남겨주신 연락처(<strong className="text-[#1c1c18]">{maskPhone(order.customerPhone)}</strong>)로 문자 전송해 드립니다.
                </p>
              </div>

              {/* Highlighted Deposit Note */}
              <div className="mt-3 p-3 bg-[#fedcc5]/50 border border-[#fedcc5] rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#725947] flex-shrink-0">info</span>
                <p className="text-[13px] text-[#725947] font-medium">
                  안내 문자 수신 후 입금이 확인되면 <strong className="underline decoration-[#aa2a49] font-bold">최종 예약 확정</strong>됩니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Order Details Summary Card */}
        <section className="w-full bg-white rounded-2xl p-4 shadow-sm border border-[#e6e2dc]/70">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e6e2dc]/60">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[22px] text-[#725947]">receipt_long</span>
              <h2 className="text-[16px] font-bold text-[#725947]">접수 내역 요약</h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#fedcc5] text-[#785f4d] text-[12px] font-bold">
              {order.status}
            </span>
          </div>

          {/* Cake Visual Spec Banner */}
          {order.intent === 'order' && (
            <div className="flex items-center gap-3 p-3 bg-[#f7f3ed] rounded-xl mb-4 border border-[#e6e2dc]/50">
              <div className="w-16 h-16 rounded-xl bg-[#fedcc5] overflow-hidden flex-shrink-0 flex items-center justify-center">
                {order.referenceImage ? (
                  <img src={order.referenceImage} alt="디자인 사진" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">🎂</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] text-[#aa2a49] font-bold">
                  {order.cakeFlavor || '수제 클래식 케이크'}
                </span>
                <span className="text-[16px] text-[#1c1c18] font-bold truncate">
                  {order.cakeSize} 사이즈
                </span>
                <span className="text-[13px] text-[#625b50]">
                  예상 금액: 약 {order.priceEstimate?.toLocaleString()}원~
                </span>
              </div>
            </div>
          )}

          {/* Details Rows */}
          <div className="space-y-3 text-[14px]">
            <div className="flex flex-col py-1">
              <span className="text-[12px] text-[#725947] font-medium">픽업 희망 일시</span>
              <span className="text-[17px] text-[#aa2a49] font-extrabold mt-0.5">
                {formattedDate()}
              </span>
            </div>

            {order.letteringText && (
              <div className="flex flex-col py-1">
                <span className="text-[12px] text-[#725947] font-medium">케이크 레터링 문구</span>
                <div className="mt-1 p-3 bg-[#f7f3ed] rounded-xl flex items-center justify-between border border-[#e6e2dc]/50">
                  <span className="text-[16px] text-[#725947] font-bold">
                    “{order.letteringText}”
                  </span>
                  <span className="material-symbols-outlined text-[20px] text-[#aa2a49] fill">draw</span>
                </div>
              </div>
            )}

            {order.inquiryDetails && (
              <div className="flex flex-col py-1">
                <span className="text-[12px] text-[#725947] font-medium">문의 내용</span>
                <div className="mt-1 p-3 bg-[#f7f3ed] rounded-xl border border-[#e6e2dc]/50 text-[#1c1c18]">
                  {order.inquiryDetails}
                </div>
              </div>
            )}

            {order.notes && (
              <div className="flex flex-col py-1">
                <span className="text-[12px] text-[#725947] font-medium">기타 요청사항</span>
                <p className="mt-1 text-[13px] text-[#625b50] bg-[#f7f3ed] p-2.5 rounded-lg border border-[#e6e2dc]/50">
                  {order.notes}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center py-1 pt-2 border-t border-[#e6e2dc]/50">
              <span className="text-[13px] text-[#725947] font-medium">예약자 성함</span>
              <span className="text-[15px] text-[#1c1c18] font-bold">{order.customerName} 님</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[13px] text-[#725947] font-medium">연락처</span>
              <span className="text-[15px] text-[#1c1c18] font-semibold">{order.customerPhone}</span>
            </div>
          </div>
        </section>

        {/* 4. Atelier Info & Quick Inquiries */}
        <section className="w-full bg-[#f7f3ed] rounded-2xl p-4 shadow-xs border border-[#e6e2dc] flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-[#725947]">storefront</span>
            <h2 className="text-[16px] font-bold text-[#725947]">매장 안내 및 문의</h2>
          </div>

          <div className="flex flex-col gap-1 text-[#1c1c18]">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#aa2a49] flex-shrink-0 mt-0.5">location_on</span>
              <div className="flex flex-col min-w-0">
                <p className="text-[14px] font-bold text-[#1c1c18]">서울시 ○○구 ○○동 (예시 주소)</p>
                <p className="text-[13px] text-[#625b50]">픽업 매장 방문 전 예약 시간을 확인해 주세요</p>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <a
              href="tel:01000000000"
              className="w-full h-12 bg-white rounded-xl flex items-center justify-center gap-1.5 shadow-xs border border-[#e6e2dc] text-[#725947] text-[13px] font-bold hover:bg-[#f1ede7] transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px] text-[#aa2a49]">call</span>
              <span>매장 전화 연결 (010-0000-0000)</span>
            </a>
          </div>
        </section>

        {/* 5. CTA Actions */}
        <section className="flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={onNewOrder}
            className="w-full h-14 rounded-full bg-[#aa2a49] text-white text-[16px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#aa2a49]/25 hover:bg-[#8c1035] active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">add_circle</span>
            <span>새로운 케이크 주문하기</span>
          </button>

          <button
            type="button"
            onClick={handleCapture}
            className="w-full h-12 rounded-full bg-[#f1ede7] border border-[#e6e2dc] text-[#725947] text-[14px] font-bold flex items-center justify-center gap-1.5 hover:bg-[#ebe8e2] active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">save_alt</span>
            <span>{captured ? '✨ 화면을 캡처해 보관해두세요!' : '접수 내역 캡처 및 화면 저장'}</span>
          </button>

          {/* Quick link to Owner screen */}
          <div className="text-center pt-3">
            <button
              type="button"
              onClick={onOpenOwner}
              className="text-[12px] text-[#8b7073] hover:text-[#aa2a49] underline cursor-pointer"
            >
              사장님 화면으로 이동
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
