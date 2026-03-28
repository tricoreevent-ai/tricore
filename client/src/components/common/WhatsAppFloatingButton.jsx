import { contactContent } from '../../data/siteContent.js';
import { getWhatsAppHref } from '../../utils/contactLinks.js';
import AppIcon from './AppIcon.jsx';

const getPrimaryWhatsAppPhone = () =>
  contactContent.whatsAppPhone ||
  contactContent.partners.flatMap((partner) => partner.phones || [])[0] ||
  '';

export default function WhatsAppFloatingButton() {
  const href = getWhatsAppHref(getPrimaryWhatsAppPhone(), contactContent.whatsAppMessage);

  if (!href) {
    return null;
  }

  return (
    <a
      aria-label="Chat with TriCore on WhatsApp"
      className="fixed bottom-20 right-5 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#1fb65a] focus:outline-none focus:ring-2 focus:ring-[#25D366]/50 focus:ring-offset-2 sm:bottom-24 sm:right-8"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <AppIcon className="h-5 w-5" name="whatsapp" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
