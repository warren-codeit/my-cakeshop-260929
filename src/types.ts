export type InquiryIntent = 'order' | 'schedule' | 'consult';

export type CakeSize = '도시락' | '1호' | '2호';

export type CakeFlavor = '생딸기 생크림' | '발로나 초코 오레오' | '얼그레이 밀크티';

export type OrderStatus = '접수대기' | '확인중' | '확정완료';

export interface CakeOrder {
  id: string;
  orderNumber: string; // e.g. #C-260929-01
  intent: InquiryIntent;
  customerName: string;
  customerPhone: string;
  pickupDate: string; // YYYY-MM-DD
  pickupTime: string; // HH:mm
  cakeSize?: CakeSize;
  cakeFlavor?: CakeFlavor;
  letteringText?: string;
  referenceImage?: string; // base64 or URL
  referenceImageName?: string;
  notes?: string;
  status: OrderStatus;
  createdAt: number; // timestamp
  priceEstimate?: number;
  inquiryDetails?: string; // For schedule or consult
}
