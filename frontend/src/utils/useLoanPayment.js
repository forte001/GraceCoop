import { usePaystackPayment } from './usePayStackPayment2';

export const useLoanPayment = () => {
  const { startPayment, loading } = usePaystackPayment();

  const initiateLoanPayment = (loanReference, isPayoff = false, customAmount = null) => {
    return startPayment({
      initiateUrl: '/members/loan/pay/initiate/',
      verifyUrl: '/members/loan/pay/verify/',
      referenceData: { loan_reference: loanReference },
      isPayoff,
      customAmount,
    });
  };

  return { initiateLoanPayment, loading };
};

