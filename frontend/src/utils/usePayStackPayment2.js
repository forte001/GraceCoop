import { useState } from 'react';
import axiosInstance from './axiosInstance';
import PaystackPop from '@paystack/inline-js';

// ✅ Normalize endpoint by removing leading slash
const normalizeUrl = (url) => url.replace(/^\/+/, '');

export const usePaystackPayment = () => {
  const [loading, setLoading] = useState(false);

  const startPayment = async ({
    initiateUrl,
    verifyUrl,
    referenceData = {},
    isPayoff = false,
    customAmount = null,
    isEntry = false, 
    overrideVerifyUrl = null,
  }) => {
    setLoading(true);

    try {
      const payload = {
        ...referenceData,
        payoff: isPayoff,
        ...(customAmount && !isPayoff ? { custom_amount: parseFloat(customAmount) } : {}),
      };

      // ✅ Get CSRF token first
      await axiosInstance.get('csrf-token/', { withCredentials: true });

      // ✅ Normalize and initiate payment
      const res = await axiosInstance.post(normalizeUrl(initiateUrl), payload);
      const { reference, amount, email, public_key } = res.data;

      const payAmount = parseFloat(amount) * 100;

      const paystack = new PaystackPop();
      paystack.newTransaction({
        key: public_key,
        email: email,
        amount: payAmount,
        reference: reference,
        callback: function (response) {
          console.log('Payment complete!', response);
          verifyPayment({ reference, verifyUrl, referenceData, isPayoff,isEntry, });
        },
        onClose: function () {
          console.log('Payment window closed.');
        },
      });
    } catch (error) {
      console.error('Error initiating payment', error);
      alert('Failed to start payment.');
    } finally {
      setLoading(false);
    }
  };

//   const verifyPayment = async ({ reference, verifyUrl, overrideVerifyUrl, referenceData = {}, isPayoff = false }) => {
//   try {
//     const finalUrl = overrideVerifyUrl
//       ? normalizeUrl(overrideVerifyUrl(reference))
//       : `${normalizeUrl(verifyUrl)}${reference}/`;

//     const payload = {
//       reference,
//       ...referenceData,
//       payoff: isPayoff,
//     };

//     await axiosInstance.get('csrf-token/', { withCredentials: true });

//     const res = await axiosInstance.post(finalUrl, payload);
//     alert(res.data.message || 'Payment verified!');
//     window.location.reload();
//   } catch (error) {
//     console.error('Verification error', error);
//     alert('Verification failed. Contact admin if payment was successful.');
//   }
// };
const verifyPayment = async ({
  reference,
  verifyUrl,
  overrideVerifyUrl,
  referenceData = {},
  isPayoff = false,
  isEntry = false, // ✅ NEW FLAG
}) => {
  try {
    let finalUrl;
    let payload;

    if (isEntry) {
      // ✅ Entry payments use the reference in the URL
      finalUrl = overrideVerifyUrl
        ? normalizeUrl(overrideVerifyUrl(reference))
        : `${normalizeUrl(verifyUrl)}${reference}/`;

      payload = {}; // No body needed for entry
    } else {
      // ✅ Other payments send the reference in the body
      finalUrl = overrideVerifyUrl
        ? normalizeUrl(overrideVerifyUrl(reference))
        : normalizeUrl(verifyUrl);

      payload = {
        reference,
        ...referenceData,
        payoff: isPayoff,
      };
    }

    await axiosInstance.get('csrf-token/', { withCredentials: true });
    const res = await axiosInstance.post(finalUrl, payload);

    alert(res.data.message || 'Payment verified!');
    window.location.reload();
  } catch (error) {
    console.error('Verification error', error);
    alert('Verification failed. Contact admin if payment was successful.');
  }
};



  return { startPayment, loading };
};
