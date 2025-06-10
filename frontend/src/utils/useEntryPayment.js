import { usePaystackPayment } from './usePayStackPayment2';

export const useEntryPayment = () => {
  const { startPayment, loading } = usePaystackPayment();

  const initiateEntryPayment = (paymentType, customAmount = null) => {
    const initiateUrl = '/members/entry-payment/initiate/';

    // To override the verifyUrl *inside* the callback using a wrapper
    return startPayment({
      initiateUrl,
      // Use a placeholder, it will be replaced dynamically below
      verifyUrl: '/members/entry-payment/verify/', 
      referenceData: {
        payment_type: paymentType,
      },
      customAmount,
      overrideVerifyUrl: (reference) => `/members/entry-payment/verify/${reference}/`,
      isEntry: true,
    });
  };

  return { initiateEntryPayment, loading };
};

