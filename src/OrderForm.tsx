import React, { useState, useEffect } from 'react';
import { InquiryIntent, CakeSize, CakeFlavor } from './types';

interface OrderFormProps {
  onSubmit: (orderData: any) => Promise<void>;
  isSubmitting: boolean;
  onOpenOwner: () => void;
}

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('이미지 파일만 첨부할 수 있습니다.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('파일을 읽는 중 오류가 발생했습니다.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('이미지를 불러오는 중 오류가 발생했습니다.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize: if width > 1000, scale down width to 1000
        if (width > 1000) {
          height = Math.round((height * 1000) / width);
          width = 1000;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 처리에 실패했습니다.'));
          return;
        }

        // Fill white background for transparent PNG converted to JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG starting from 0.85 down to 0.2 to fit within 500KB
        const qualities = [0.85, 0.7, 0.5, 0.35, 0.2];
        let chosenDataUrl: string | null = null;

        for (const q of qualities) {
          const dataUrl = canvas.toDataURL('image/jpeg', q);
          const head = 'data:image/jpeg;base64,';
          const base64Content = dataUrl.startsWith(head) ? dataUrl.slice(head.length) : dataUrl;
          const byteSize = (base64Content.length * 3) / 4;

          if (byteSize <= 500 * 1024) {
            chosenDataUrl = dataUrl;
            break;
          }
        }

        if (chosenDataUrl) {
          resolve(chosenDataUrl);
        } else {
          reject(new Error('사진이 너무 커요'));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

export const OrderForm: React.FC<OrderFormProps> = ({
  onSubmit,
  isSubmitting,
  onOpenOwner,
}) => {
  const [intent, setIntent] = useState<InquiryIntent>('order');
  const [cakeSize, setCakeSize] = useState<CakeSize>('1호');
  const [cakeFlavor, setCakeFlavor] = useState<CakeFlavor>('생딸기 생크림');
  const [letteringText, setLetteringText] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImageName, setReferenceImageName] = useState<string>('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [inquiryDetails, setInquiryDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [minDateStr, setMinDateStr] = useState('');

  useEffect(() => {
    // Min date is at least 2 days ahead
    const now = new Date();
    now.setDate(now.getDate() + 2);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const minD = `${yyyy}-${mm}-${dd}`;
    setMinDateStr(minD);
    setPickupDate(minD);
  }, []);

  const setPresetDate = (daysAhead: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    setPickupDate(`${yyyy}-${mm}-${dd}`);
  };

  const setNextWeekend = (dayName: '금' | '토' | '일') => {
    const target = new Date();
    const currentDay = target.getDay(); // 0: Sun, 5: Fri, 6: Sat
    let targetDayNum = 5;
    if (dayName === '금') targetDayNum = 5;
    if (dayName === '토') targetDayNum = 6;
    if (dayName === '일') targetDayNum = 0;

    let diff = (targetDayNum - currentDay + 7) % 7;
    if (diff < 2) diff += 7; // Must be at least 2 days ahead
    target.setDate(target.getDate() + diff);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    setPickupDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        setReferenceImageName(file.name);
        setReferenceImage(compressedBase64);
      } catch (err: any) {
        alert(err.message || '사진이 너무 커요');
        e.target.value = '';
      }
    }
  };

  const calculateEstimate = () => {
    if (intent !== 'order') return 0;
    let base = 38000;
    if (cakeSize === '도시락') base = 19000;
    if (cakeSize === '1호') base = 38000;
    if (cakeSize === '2호') base = 48000;
    return base;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      alert('필독사항에 동의해주세요.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim() || !pickupDate || !pickupTime) {
      alert('필수 입력 항목을 모두 작성해주세요.');
      return;
    }
    if (intent === 'order' && !letteringText.trim()) {
      alert('케이크 위 레터링 문구를 입력해주세요 (없을 시 "없음" 입력).');
      return;
    }

    const payload: Record<string, any> = {
      intent,
      pickupDate,
      pickupTime,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      notes: notes.trim(),
      priceEstimate: calculateEstimate(),
    };

    if (intent === 'order') {
      payload.cakeSize = cakeSize;
      payload.cakeFlavor = cakeFlavor;
      payload.letteringText = letteringText.trim();
    } else {
      payload.inquiryDetails = inquiryDetails.trim();
    }

    if (referenceImage) {
      payload.referenceImage = referenceImage;
      payload.referenceImageName = referenceImageName;
    }

    await onSubmit(payload);
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#fdf9f3] pb-20">
      {/* Top Fixed Header */}
      <header className="sticky top-0 z-40 w-full bg-[#fdf9f3]/90 backdrop-blur-xl border-b border-[#e6e2dc]/60 shadow-[0_1px_8px_rgba(74,53,37,0.05)]">
        <div className="h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#fedcc5] text-[#725947] flex-shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[24px]">cake</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[17px] text-[#725947] tracking-tight">오늘의 케이크</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#ffd9dd] text-[#aa2a49] text-[11px] font-bold leading-tight">
                  주문·예약
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px]">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span className="text-[#625b50] font-medium">예약 접수중</span>
                <span className="text-[#8b7073]/40">•</span>
                <span className="text-[#aa2a49] font-medium">Cake Home</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a
              href="tel:01000000000"
              aria-label="전화 문의"
              className="w-10 h-10 flex items-center justify-center rounded-full text-[#725947] hover:bg-[#ebe8e2] transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">call</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="flex flex-col w-full max-w-lg mx-auto">
        {/* Top Store Hero Section */}
        <section className="px-4 pt-5 pb-5 flex flex-col gap-3 bg-[#f7f3ed]">
          <div className="flex flex-col gap-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fedcc5] text-[#785f4d] w-fit shadow-xs">
              <span className="material-symbols-outlined text-[15px] fill">cake</span>
              <span className="text-[12px] font-semibold">1인 수제 케이크 아뜰리에</span>
            </div>
            <h1 className="text-[26px] font-bold text-[#1c1c18] tracking-tight mt-1">오늘의 케이크</h1>
            <p className="text-[15px] text-[#725947] leading-relaxed">
              소중한 기념일을 더 특별하게, 매일 신선한 유크림과 좋은 재료로 정성을 다해 굽는 주문제작 케이크 숍입니다.
            </p>
          </div>

          {/* Store Info Detail Card */}
          <div className="p-4 rounded-2xl bg-white shadow-xs border border-[#e6e2dc]/60 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#aa2a49] text-[20px] mt-0.5 flex-shrink-0">
                schedule
              </span>
              <div className="flex flex-col text-[14px]">
                <span className="font-semibold text-[#1c1c18]">영업시간: 화~일 11:30 ~ 20:00</span>
                <span className="text-[#625b50]">매주 월요일 정기휴무 (픽업 불가)</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#aa2a49] text-[20px] mt-0.5 flex-shrink-0">
                location_on
              </span>
              <div className="flex flex-col text-[14px]">
                <span className="font-semibold text-[#1c1c18]">서울시 ○○구 ○○동 (예시 주소)</span>
                <span className="text-[#625b50]">픽업 매장 방문 전 예약 시간을 확인해 주세요</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#aa2a49] text-[20px] mt-0.5 flex-shrink-0">
                call
              </span>
              <div className="flex flex-col text-[14px]">
                <span className="font-semibold text-[#1c1c18]">문의: 010-0000-0000</span>
                <span className="text-[#625b50]">케이크 아이싱 작업 중에는 통화가 어려울 수 있으니 문자나 본 양식을 남겨주세요.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Notice Banner (Important Policy Card) */}
        <section className="px-4 pt-4">
          <div className="p-4 rounded-2xl bg-[#ffd9dd] text-[#400012] shadow-xs flex flex-col gap-2.5 border border-[#ffb2bc]/60">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#aa2a49] text-[24px]">campaign</span>
              <h2 className="text-[17px] font-bold text-[#400012]">주문 전 꼭 읽어주세요! (필독 안내)</h2>
            </div>
            <ul className="flex flex-col gap-1.5 text-[13px] leading-relaxed text-[#584143]">
              <li className="flex items-start gap-1.5">
                <span className="text-[#aa2a49] font-bold">•</span>
                <span>
                  <strong className="font-bold text-[#aa2a49]">최소 예약 일자:</strong> 100% 수제 공정상{' '}
                  <strong className="underline decoration-[#aa2a49] font-bold">최소 픽업 2일 전 예약 필수</strong> (당일/익일 수령 불가)
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#aa2a49] font-bold">•</span>
                <span>
                  <strong className="font-bold text-[#1c1c18]">확정 절차:</strong> 주문서 접수 → 사장님 확인 후 1~2시간 내 확정 문자 및 결제 계좌 전송 → 입금 확인 시 예약 완료
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#aa2a49] font-bold">•</span>
                <span>
                  <strong className="font-bold text-[#1c1c18]">취소 및 환불:</strong> 픽업 3일 전 100% 환불 / 2일 전 50% 환불 / 전일 및 당일 취소 시 환불 불가
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* Interactive Intake Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4 pt-6 pb-12">
          {/* Intent Selector */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-[16px] font-bold text-[#1c1c18]">어떤 문의를 남기시겠어요?</span>
              <span className="text-[#aa2a49] font-bold">*</span>
            </div>
            <p className="text-[13px] text-[#625b50]">용도에 알맞은 주문서 양식으로 자동 전환됩니다.</p>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setIntent('order')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  intent === 'order'
                    ? 'bg-white text-[#aa2a49] border-[#aa2a49] shadow-sm ring-2 ring-[#aa2a49]/30 font-bold'
                    : 'bg-[#f1ede7] text-[#725947] border-transparent hover:bg-[#ebe8e2]'
                }`}
              >
                <span className="text-2xl mb-0.5">🎂</span>
                <span className="text-[14px]">케이크 주문</span>
                <span className="text-[11px] opacity-80 mt-0.5">상세 제작서</span>
              </button>
              <button
                type="button"
                onClick={() => setIntent('schedule')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  intent === 'schedule'
                    ? 'bg-white text-[#aa2a49] border-[#aa2a49] shadow-sm ring-2 ring-[#aa2a49]/30 font-bold'
                    : 'bg-[#f1ede7] text-[#725947] border-transparent hover:bg-[#ebe8e2]'
                }`}
              >
                <span className="text-2xl mb-0.5">📅</span>
                <span className="text-[14px]">일정 문의</span>
                <span className="text-[11px] opacity-80 mt-0.5">예약 가능 여부</span>
              </button>
              <button
                type="button"
                onClick={() => setIntent('consult')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                  intent === 'consult'
                    ? 'bg-white text-[#aa2a49] border-[#aa2a49] shadow-sm ring-2 ring-[#aa2a49]/30 font-bold'
                    : 'bg-[#f1ede7] text-[#725947] border-transparent hover:bg-[#ebe8e2]'
                }`}
              >
                <span className="text-2xl mb-0.5">💬</span>
                <span className="text-[14px]">기타 상담</span>
                <span className="text-[11px] opacity-80 mt-0.5">답례품·대량</span>
              </button>
            </div>
          </div>

          {/* Section 1: Cake Options (Only in order mode) */}
          {intent === 'order' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-1.5 pb-1">
                <span className="w-6 h-6 rounded-full bg-[#fedcc5] text-[#785f4d] flex items-center justify-center text-[12px] font-bold">
                  1
                </span>
                <h3 className="text-[18px] font-bold text-[#1c1c18]">케이크 옵션 선택</h3>
                <span className="text-[#aa2a49] font-bold">*</span>
              </div>

              {/* Size Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-semibold text-[#1c1c18]">크기 선택 (사이즈 가이드)</label>
                <div className="flex flex-col gap-2">
                  {/* Bento */}
                  <label
                    className={`flex items-center justify-between p-3.5 rounded-2xl bg-white border cursor-pointer transition-all ${
                      cakeSize === '도시락' ? 'border-[#aa2a49] ring-2 ring-[#aa2a49]/20 shadow-sm' : 'border-[#e6e2dc]/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="cake_size"
                        checked={cakeSize === '도시락'}
                        onChange={() => setCakeSize('도시락')}
                        className="accent-[#aa2a49] w-5 h-5 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-[#1c1c18]">도시락 케이크 (지름 약 10cm)</span>
                        <span className="text-[12px] text-[#625b50]">1~2인이 가볍게 축하하기 좋은 미니멀 사이즈</span>
                      </div>
                    </div>
                    <span className="text-[15px] font-bold text-[#aa2a49]">19,000원~</span>
                  </label>

                  {/* 1호 */}
                  <label
                    className={`flex items-center justify-between p-3.5 rounded-2xl bg-white border cursor-pointer transition-all ${
                      cakeSize === '1호' ? 'border-[#aa2a49] ring-2 ring-[#aa2a49]/20 shadow-sm' : 'border-[#e6e2dc]/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="cake_size"
                        checked={cakeSize === '1호'}
                        onChange={() => setCakeSize('1호')}
                        className="accent-[#aa2a49] w-5 h-5 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[15px] font-bold text-[#1c1c18]">1호 케이크 (지름 약 15cm)</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#aa2a49] text-white text-[10px] font-bold">인기 최고</span>
                        </div>
                        <span className="text-[12px] text-[#625b50]">3~4인용 생일파티 및 기념일 대표 추천 규격</span>
                      </div>
                    </div>
                    <span className="text-[15px] font-bold text-[#aa2a49]">38,000원~</span>
                  </label>

                  {/* 2호 */}
                  <label
                    className={`flex items-center justify-between p-3.5 rounded-2xl bg-white border cursor-pointer transition-all ${
                      cakeSize === '2호' ? 'border-[#aa2a49] ring-2 ring-[#aa2a49]/20 shadow-sm' : 'border-[#e6e2dc]/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="cake_size"
                        checked={cakeSize === '2호'}
                        onChange={() => setCakeSize('2호')}
                        className="accent-[#aa2a49] w-5 h-5 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-[#1c1c18]">2호 케이크 (지름 약 18cm)</span>
                        <span className="text-[12px] text-[#625b50]">5~6인 가족 모임 및 홈파티용 풍성한 사이즈</span>
                      </div>
                    </div>
                    <span className="text-[15px] font-bold text-[#aa2a49]">48,000원~</span>
                  </label>
                </div>
              </div>

              {/* Sheet & Flavor Selection */}
              <div className="flex flex-col gap-2 mt-1">
                <label className="text-[14px] font-semibold text-[#1c1c18]">시트 &amp; 크림 맛 선택</label>
                <div className="flex flex-col gap-2">
                  <label
                    className={`flex items-center justify-between p-3.5 rounded-2xl bg-white border cursor-pointer transition-all ${
                      cakeFlavor === '생딸기 생크림' ? 'border-[#aa2a49] ring-2 ring-[#aa2a49]/20 shadow-sm' : 'border-[#e6e2dc]/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="cake_flavor"
                        checked={cakeFlavor === '생딸기 생크림'}
                        onChange={() => setCakeFlavor('생딸기 생크림')}
                        className="accent-[#aa2a49] w-5 h-5 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[14px] font-bold text-[#1c1c18]">🍓 바닐라 제누와즈 + 생딸기</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#fedcc5] text-[#785f4d] text-[10px] font-bold">시그니처</span>
                        </div>
                        <span className="text-[12px] text-[#625b50]">100% 서울우유 동물성 생크림과 상큼한 제철 딸기</span>
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center justify-between p-3.5 rounded-2xl bg-white border cursor-pointer transition-all ${
                      cakeFlavor === '발로나 초코 오레오' ? 'border-[#aa2a49] ring-2 ring-[#aa2a49]/20 shadow-sm' : 'border-[#e6e2dc]/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="cake_flavor"
                        checked={cakeFlavor === '발로나 초코 오레오'}
                        onChange={() => setCakeFlavor('발로나 초코 오레오')}
                        className="accent-[#aa2a49] w-5 h-5 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-[#1c1c18]">🍫 발로나 초코 시트 + 오레오 크림치즈</span>
                        <span className="text-[12px] text-[#625b50]">진한 프랑스산 발로나 코코아와 바삭한 쿠키의 조화</span>
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center justify-between p-3.5 rounded-2xl bg-white border cursor-pointer transition-all ${
                      cakeFlavor === '얼그레이 밀크티' ? 'border-[#aa2a49] ring-2 ring-[#aa2a49]/20 shadow-sm' : 'border-[#e6e2dc]/70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="cake_flavor"
                        checked={cakeFlavor === '얼그레이 밀크티'}
                        onChange={() => setCakeFlavor('얼그레이 밀크티')}
                        className="accent-[#aa2a49] w-5 h-5 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-[#1c1c18]">🍵 보성 얼그레이 시트 + 밀크티 가나슈</span>
                        <span className="text-[12px] text-[#625b50]">직접 우려낸 향긋한 홍차 풍미와 부드러운 화이트 가나슈</span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Lettering & Design Details (Only in order mode) */}
          {intent === 'order' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-1.5 pb-1">
                <span className="w-6 h-6 rounded-full bg-[#fedcc5] text-[#785f4d] flex items-center justify-center text-[12px] font-bold">
                  2
                </span>
                <h3 className="text-[18px] font-bold text-[#1c1c18]">레터링 &amp; 디자인</h3>
                <span className="text-[#aa2a49] font-bold">*</span>
              </div>

              {/* Lettering Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[14px] font-semibold text-[#1c1c18]">케이크 위 레터링 문구 (필수)</label>
                  <span className="text-[12px] text-[#625b50]">{letteringText.length} / 15자</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={15}
                    value={letteringText}
                    onChange={(e) => setLetteringText(e.target.value)}
                    placeholder="예: Happy Birthday Jiwoo ❤️ (문구 없을 시 '없음')"
                    className="w-full h-13 px-4 rounded-xl bg-white border border-[#e6e2dc] text-[#1c1c18] text-[15px] placeholder:text-[#8b7073]/50 shadow-xs focus:outline-none focus:border-[#aa2a49] focus:ring-2 focus:ring-[#aa2a49]/20"
                    required={intent === 'order'}
                  />
                </div>
                <p className="text-[12px] text-[#625b50]">
                  ※ 특수문자나 하트, 꽃 이모지는 케이크 제작 시 어울리는 손글씨 데코로 반영됩니다.
                </p>
              </div>

              {/* Reference Photo Dropzone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-[#1c1c18]">디자인 참고 사진 (선택)</label>
                <div
                  onClick={() => document.getElementById('cake-file-input')?.click()}
                  className="p-5 rounded-2xl bg-[#f7f3ed] border-2 border-dashed border-[#e6e2dc] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#f1ede7] transition-all"
                >
                  <input
                    id="cake-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  {referenceImage ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={referenceImage}
                        alt="참고 사진"
                        className="w-24 h-24 object-cover rounded-xl shadow-md border border-white"
                      />
                      <span className="text-[13px] font-bold text-[#aa2a49] truncate max-w-xs">
                        {referenceImageName || '사진 첨부 완료 (클릭하여 변경)'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-[#fedcc5] text-[#725947] flex items-center justify-center mb-2">
                        <span className="material-symbols-outlined text-[24px]">add_photo_alternate</span>
                      </div>
                      <span className="text-[14px] font-semibold text-[#1c1c18]">
                        원하시는 디자인 스케치나 참고 사진을 올려주세요
                      </span>
                      <span className="text-[12px] text-[#625b50] mt-0.5">
                        손그림이나 캡처 사진도 좋아요! (가로 최대 1000px 자동 최적화, 500KB 이하)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Inquiry Details (Only in schedule or consult mode) */}
          {intent !== 'order' && (
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-[#1c1c18]">
                {intent === 'schedule' ? '일정 문의 상세 내용 (필수)' : '기타 상담 내용 (필수)'}
              </label>
              <textarea
                value={inquiryDetails}
                onChange={(e) => setInquiryDetails(e.target.value)}
                placeholder={
                  intent === 'schedule'
                    ? '예: 11월 5일(화) 정기휴무일인데 오전 10시에 픽업 가능할까요? 친구 생일이라 꼭 주문하고 싶습니다!'
                    : '예: 11월 중순 스몰웨딩 하객용 답례품으로 큐브 미니케이크 20개 패키지 견적과 리본 포장 옵션이 궁금하여 문의드립니다.'
                }
                rows={4}
                className="w-full p-4 rounded-xl bg-white border border-[#e6e2dc] text-[#1c1c18] text-[15px] placeholder:text-[#8b7073]/50 shadow-xs focus:outline-none focus:border-[#aa2a49] focus:ring-2 focus:ring-[#aa2a49]/20"
                required
              />
            </div>
          )}

          {/* Section 3: Pickup Schedule */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-1.5 pb-1">
              <span className="w-6 h-6 rounded-full bg-[#fedcc5] text-[#785f4d] flex items-center justify-center text-[12px] font-bold">
                {intent === 'order' ? '3' : '1'}
              </span>
              <h3 className="text-[18px] font-bold text-[#1c1c18]">픽업 일정 선택</h3>
              <span className="text-[#aa2a49] font-bold">*</span>
            </div>

            {/* Date Input & Quick Presets */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-[#1c1c18]">픽업 희망 날짜</label>
              <input
                type="date"
                min={minDateStr}
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                required
                className="w-full h-13 px-4 rounded-xl bg-white border border-[#e6e2dc] text-[#1c1c18] text-[15px] shadow-xs focus:outline-none focus:border-[#aa2a49] focus:ring-2 focus:ring-[#aa2a49]/20 cursor-pointer"
              />
              <div className="flex items-center gap-1 text-[#aa2a49] mt-0.5">
                <span className="material-symbols-outlined text-[16px]">info</span>
                <span className="text-[12px] font-semibold">최소 2일 전 예약만 가능 (오늘/내일 날짜는 선택 불가)</span>
              </div>

              {/* Quick Preset Date Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <button
                  type="button"
                  onClick={() => setPresetDate(2)}
                  className="px-3 py-1.5 rounded-full bg-[#f1ede7] text-[#725947] text-[12px] font-medium whitespace-nowrap active:bg-[#aa2a49] active:text-white transition-colors"
                >
                  모레 픽업
                </button>
                <button
                  type="button"
                  onClick={() => setNextWeekend('금')}
                  className="px-3 py-1.5 rounded-full bg-[#f1ede7] text-[#725947] text-[12px] font-medium whitespace-nowrap active:bg-[#aa2a49] active:text-white transition-colors"
                >
                  이번 주 금요일
                </button>
                <button
                  type="button"
                  onClick={() => setNextWeekend('토')}
                  className="px-3 py-1.5 rounded-full bg-[#f1ede7] text-[#725947] text-[12px] font-medium whitespace-nowrap active:bg-[#aa2a49] active:text-white transition-colors"
                >
                  이번 주 토요일
                </button>
                <button
                  type="button"
                  onClick={() => setNextWeekend('일')}
                  className="px-3 py-1.5 rounded-full bg-[#f1ede7] text-[#725947] text-[12px] font-medium whitespace-nowrap active:bg-[#aa2a49] active:text-white transition-colors"
                >
                  이번 주 일요일
                </button>
              </div>
            </div>

            {/* Pickup Time Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-[#1c1c18]">픽업 희망 시간 (12:00 ~ 19:30)</label>
              <select
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                required
                className="w-full h-13 px-4 rounded-xl bg-white border border-[#e6e2dc] text-[#1c1c18] text-[15px] shadow-xs focus:outline-none focus:border-[#aa2a49] focus:ring-2 focus:ring-[#aa2a49]/20"
              >
                <option value="">픽업 시간을 선택해주세요</option>
                <option value="12:00">12:00 (오후 첫 타임)</option>
                <option value="12:30">12:30</option>
                <option value="13:00">13:00</option>
                <option value="13:30">13:30</option>
                <option value="14:00">14:00</option>
                <option value="14:30">14:30</option>
                <option value="15:00">15:00</option>
                <option value="15:30">15:30</option>
                <option value="16:00">16:00</option>
                <option value="16:30">16:30</option>
                <option value="17:00">17:00</option>
                <option value="17:30">17:30</option>
                <option value="18:00">18:00</option>
                <option value="18:30">18:30</option>
                <option value="19:00">19:00</option>
                <option value="19:30">19:30 (마지막 픽업)</option>
              </select>
              <p className="text-[12px] text-[#625b50]">매장 사정에 따라 19:30 이후 픽업은 별도 문의 부탁드립니다.</p>
            </div>
          </div>

          {/* Section 4: Customer Details & Requests */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-1.5 pb-1">
              <span className="w-6 h-6 rounded-full bg-[#fedcc5] text-[#785f4d] flex items-center justify-center text-[12px] font-bold">
                {intent === 'order' ? '4' : '2'}
              </span>
              <h3 className="text-[18px] font-bold text-[#1c1c18]">주문자 정보</h3>
              <span className="text-[#aa2a49] font-bold">*</span>
            </div>

            {/* Customer Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-[#1c1c18]">예약자 성함 (필수)</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="예약자 본인 성함 (예: 홍길동)"
                required
                className="w-full h-13 px-4 rounded-xl bg-white border border-[#e6e2dc] text-[#1c1c18] text-[15px] placeholder:text-[#8b7073]/50 shadow-xs focus:outline-none focus:border-[#aa2a49] focus:ring-2 focus:ring-[#aa2a49]/20"
              />
            </div>

            {/* Customer Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-[#1c1c18]">휴대폰 번호 (필수)</label>
              <input
                type="tel"
                maxLength={13}
                value={customerPhone}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  if (raw.length <= 3) {
                    setCustomerPhone(raw);
                  } else if (raw.length <= 7) {
                    setCustomerPhone(`${raw.slice(0, 3)}-${raw.slice(3)}`);
                  } else {
                    setCustomerPhone(`${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`);
                  }
                }}
                placeholder="010-0000-0000 (확정 문자 발송용)"
                required
                className="w-full h-13 px-4 rounded-xl bg-white border border-[#e6e2dc] text-[#1c1c18] text-[15px] placeholder:text-[#8b7073]/50 shadow-xs focus:outline-none focus:border-[#aa2a49] focus:ring-2 focus:ring-[#aa2a49]/20"
              />
            </div>

            {/* Additional Requests */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-[#1c1c18]">기타 요청사항 (선택)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="보냉백 추가(1,000원), 숫자초/디자인초 개수, 특정 알레르기(견과류, 유제품) 등 요청사항을 자유롭게 적어주세요."
                className="w-full p-4 rounded-xl bg-white border border-[#e6e2dc] text-[#1c1c18] text-[15px] placeholder:text-[#8b7073]/50 shadow-xs focus:outline-none focus:border-[#aa2a49] focus:ring-2 focus:ring-[#aa2a49]/20 resize-none"
              />
            </div>
          </div>

          {/* Agreement Checkbox */}
          <div className="p-4 rounded-2xl bg-[#f1ede7] border border-[#e6e2dc] flex items-start gap-3">
            <input
              type="checkbox"
              id="agreement"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              required
              className="accent-[#aa2a49] w-5 h-5 mt-0.5 rounded cursor-pointer flex-shrink-0"
            />
            <label htmlFor="agreement" className="text-[13px] text-[#1c1c18] leading-relaxed cursor-pointer select-none">
              <strong className="text-[#aa2a49] font-bold">(필수)</strong> 주문 전 필독사항(최소 2일 전 예약 필수, 취소/환불 규정, 입금 확인 후 최종 확정)을 모두 확인하였으며 이에 동의합니다.
            </label>
          </div>

          {/* Submit Button Section */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="text-center text-[13px] text-[#625b50]">
              로그인 없이 3분 만에 간편 주문 접수 완료!
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 rounded-full bg-[#aa2a49] text-white font-bold text-[17px] flex items-center justify-center gap-2 shadow-lg shadow-[#aa2a49]/25 hover:bg-[#8c1035] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>접수 처리 중...</span>
              ) : (
                <>
                  <span>문의·주문서 제출하기 (사장님께 전송)</span>
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </>
              )}
            </button>
            <div className="flex items-center justify-center gap-1 text-center text-[12px] text-[#625b50] mt-1">
              <span className="material-symbols-outlined text-[16px] text-[#aa2a49]">verified_user</span>
              <span>접수 즉시 사장님 스마트폰으로 알림이 가며, 순차적으로 확인 문자를 드립니다.</span>
            </div>
          </div>

          {/* Owner Dashboard link at bottom */}
          <div className="pt-6 pb-2 text-center border-t border-[#e6e2dc]/60">
            <button
              type="button"
              onClick={onOpenOwner}
              className="text-[12px] text-[#8b7073] hover:text-[#aa2a49] underline cursor-pointer inline-flex items-center gap-1 py-1 px-2 rounded hover:bg-[#f1ede7] transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">shield_person</span>
              <span>사장님 화면</span>
            </button>
          </div>
        </form>
      </main>

      {/* Bottom Sticky Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#fdf9f3]/95 backdrop-blur-xl border-t border-[#e6e2dc]/70 shadow-[0_-2px_12px_rgba(74,53,37,0.06)]">
        <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-2">
          <button
            type="button"
            className="flex flex-col items-center justify-center min-w-[56px] h-12 text-[#aa2a49] font-bold"
          >
            <span className="material-symbols-outlined text-[24px] fill">storefront</span>
            <span className="text-[11px] mt-0.5">홈</span>
          </button>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 350, behavior: 'smooth' })}
            className="flex flex-col items-center justify-center min-w-[56px] h-12 text-[#625b50] hover:text-[#1c1c18] transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">draw</span>
            <span className="text-[11px] mt-0.5">주문제작</span>
          </button>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 350, behavior: 'smooth' })}
            className="flex flex-col items-center justify-center min-w-[56px] h-12 text-[#625b50] hover:text-[#1c1c18] transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">photo_library</span>
            <span className="text-[11px] mt-0.5">쇼케이스</span>
          </button>
          <button
            type="button"
            onClick={() => {
              alert('주문 후 발송되는 확인 문자 또는 사장님께 전화(010-0000-0000)로 즉시 조회 가능합니다.');
            }}
            className="flex flex-col items-center justify-center min-w-[56px] h-12 text-[#625b50] hover:text-[#1c1c18] transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">event_available</span>
            <span className="text-[11px] mt-0.5">예약조회</span>
          </button>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col items-center justify-center min-w-[56px] h-12 text-[#625b50] hover:text-[#1c1c18] transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">schedule</span>
            <span className="text-[11px] mt-0.5">매장안내</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
