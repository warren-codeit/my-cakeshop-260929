import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { OrderForm } from './OrderForm';
import { OrderCompleted } from './OrderCompleted';
import { OwnerDashboard } from './OwnerDashboard';
import { CakeOrder } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<'form' | 'completed' | 'owner'>('form');
  const [submittedOrder, setSubmittedOrder] = useState<CakeOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate order sequence number format #C-YYMMDD-XXXXXX (6 random alphanumeric chars)
  const generateOrderNumber = () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `#C-${yy}${mm}${dd}-${code}`;
  };

  const handleOrderSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const orderNumber = generateOrderNumber();
      // Remove any undefined properties since Firestore does not allow undefined
      const sanitizedFormData = Object.fromEntries(
        Object.entries(formData).filter(([_, value]) => value !== undefined)
      );

      const newOrderData = {
        ...sanitizedFormData,
        orderNumber,
        status: '접수대기',
        createdAt: Date.now(),
      };

      const docRef = await addDoc(collection(db, 'orders'), newOrderData);
      const createdOrder: CakeOrder = {
        id: docRef.id,
        ...newOrderData,
      } as CakeOrder;

      setSubmittedOrder(createdOrder);
      setCurrentView('completed');
    } catch (err: any) {
      console.error('Order submission error:', err);
      alert(`주문 접수 중 오류가 발생했습니다: ${err.message || '네트워크를 확인해주세요'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentView === 'owner') {
    return <OwnerDashboard onBackToCustomer={() => setCurrentView('form')} />;
  }

  if (currentView === 'completed' && submittedOrder) {
    return (
      <OrderCompleted
        order={submittedOrder}
        onNewOrder={() => {
          setSubmittedOrder(null);
          setCurrentView('form');
        }}
        onOpenOwner={() => setCurrentView('owner')}
      />
    );
  }

  return (
    <OrderForm
      onSubmit={handleOrderSubmit}
      isSubmitting={isSubmitting}
      onOpenOwner={() => setCurrentView('owner')}
    />
  );
}
