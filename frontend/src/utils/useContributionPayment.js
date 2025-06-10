import { usePaystackPayment } from "./usePayStackPayment2";

export const useContributionPayment = () => {
  const { startPayment, loading } = usePaystackPayment();

  const initiateContributionPayment = (amount) => {
    return startPayment({
      initiateUrl: '/members/contribution/pay/initiate/',
      verifyUrl: '/members/contribution/pay/verify/',
      referenceData: {
        custom_amount: amount,
      },
    });
  };

  return { initiateContributionPayment, loading };
};

