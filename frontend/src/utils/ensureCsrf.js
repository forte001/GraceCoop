import axios from 'axios';

export const ensureCsrf = async () => {
  try {
    await axios.get('http://localhost:8000/csrf-token/'); 
    console.log('✅ CSRF cookie set');
  } catch (error) {
    console.error('❌ Failed to get CSRF cookie', error);
  }
};