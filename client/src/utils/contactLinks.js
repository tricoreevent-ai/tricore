const digitsOnly = (value) => String(value || '').replace(/\D/g, '');

export const getTelephoneHref = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;

export const getWhatsAppHref = (phone, message = '') => {
  const phoneDigits = digitsOnly(phone);

  if (!phoneDigits) {
    return '';
  }

  const normalizedMessage = String(message || '').trim();
  const baseUrl = `https://wa.me/${phoneDigits}`;

  return normalizedMessage
    ? `${baseUrl}?text=${encodeURIComponent(normalizedMessage)}`
    : baseUrl;
};
