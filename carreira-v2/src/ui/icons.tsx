// Ícones vetoriais simples (traço 1.8, mesmo estilo das pranchas).
type P = { className?: string };
const S = (props: P & { children: React.ReactNode }) => (
  <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{props.children}</svg>
);
export const IconArrow = (p: P) => <S {...p}><path d="M4 12h15M13 6l6 6-6 6" /></S>;
export const IconChevron = (p: P) => <S {...p}><path d="m9 6 6 6-6 6" /></S>;
export const IconPitch = (p: P) => <S {...p}><rect x="2.5" y="5" width="19" height="14" rx="1" /><path d="M12 5v14" /><circle cx="12" cy="12" r="2.4" /><path d="M2.5 9.5h2.5v5H2.5M21.5 9.5H19v5h2.5" /></S>;
export const IconCalendar = (p: P) => <S {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><path d="M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" strokeWidth="2.4" /></S>;
export const IconHome = (p: P) => <S {...p}><path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.5V20h13V9.5" /></S>;
export const IconUsers = (p: P) => <S {...p}><circle cx="12" cy="8" r="3" /><path d="M6.5 19c.5-3 2.7-5 5.5-5s5 2 5.5 5" /><circle cx="5.5" cy="9.5" r="2.2" /><path d="M2 17.5c.3-2 1.6-3.4 3.5-3.6" /><circle cx="18.5" cy="9.5" r="2.2" /><path d="M22 17.5c-.3-2-1.6-3.4-3.5-3.6" /></S>;
export const IconMore = (p: P) => <S {...p}><circle cx="5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="19" cy="12" r="1.3" fill="currentColor" /></S>;
export const IconAlert = (p: P) => <S {...p}><path d="M12 4 2.5 20h19Z" /><path d="M12 10v4.5M12 17.5h.01" /></S>;
export const IconMail = (p: P) => <S {...p}><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></S>;
export const IconBack = (p: P) => <S {...p}><path d="m15 5-7 7 7 7" /></S>;
export const IconDown = (p: P) => <S {...p}><path d="m6 9 6 6 6-6" /></S>;
export const IconCheck = (p: P) => <S {...p}><path d="m5.5 12.5 4.2 4 8.8-9" /></S>;
