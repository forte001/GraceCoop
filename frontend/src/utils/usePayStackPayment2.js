// src/utils/usePaystackPayment.js

import { useState } from 'react';
import { getAxiosByRole } from './getAxiosByRole';
import PaystackPop from '@paystack/inline-js';

// ✅ Normalize endpoint by removing leading slash
const normalizeUrl = (url) => url.replace(/^\/+/, '');

export const usePaystackPayment = () => {
  const [loading, setLoading] = useState(false);
  const axios = getAxiosByRole();

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

      // ✅ Get CSRF token
      await axios.get('csrf-token/', { withCredentials: true });

      // ✅ Initiate payment
      const res = await axios.post(normalizeUrl(initiateUrl), payload);
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
          verifyPayment({
            reference,
            verifyUrl,
            overrideVerifyUrl,
            referenceData,
            isPayoff,
            isEntry,
          });
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

  const verifyPayment = async ({
    reference,
    verifyUrl,
    overrideVerifyUrl,
    referenceData = {},
    isPayoff = false,
    isEntry = false,
  }) => {
    try {
      let finalUrl;
      let payload;

      if (isEntry) {
        finalUrl = overrideVerifyUrl
          ? normalizeUrl(overrideVerifyUrl(reference))
          : `${normalizeUrl(verifyUrl)}${reference}/`;
        payload = {}; // No body for entry payment verification
      } else {
        finalUrl = overrideVerifyUrl
          ? normalizeUrl(overrideVerifyUrl(reference))
          : normalizeUrl(verifyUrl);
        payload = {
          reference,
          ...referenceData,
          payoff: isPayoff,
        };
      }

      await axios.get('csrf-token/', { withCredentials: true });
      const res = await axios.post(finalUrl, payload);

      alert(res.data.message || 'Payment verified!');
      window.location.reload();
    } catch (error) {
      console.error('Verification error', error);
      alert('Verification failed. Contact admin if payment was successful.');
    }
  };

  return { startPayment, loading };
};
