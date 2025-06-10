import { usePaystackPayment } from './usePayStackPayment2';

export const useLevyPayment = () => {
  const { startPayment, loading } = usePaystackPayment();

  const initiateLevyPayment = (amount) => {
    return startPayment({
      initiateUrl: '/members/levy/pay/initiate/',
      verifyUrl: '/members/levy/pay/verify/',
      referenceData: {
        custom_amount: amount,
      },
      
    });
  };

  return { initiateLevyPayment, loading };
};
