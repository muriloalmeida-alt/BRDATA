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
export const IconPause = (p: P) => <svg className={p.className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1" /><rect x="14" y="4.5" width="4" height="15" rx="1" /></svg>;
export const IconPlay = (p: P) => <svg className={p.className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.5-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8Z" /></svg>;
export const IconSliders = (p: P) => <S {...p}><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2.2" /><circle cx="10" cy="17" r="2.2" /><path d="M4 12h2M10 12h10" /><circle cx="8" cy="12" r="2.2" /></S>;
export const IconBall = (p: P) => <svg className={p.className} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="m12 7.2 3.6 2.6-1.4 4.2H9.8L8.4 9.8Z" fill="var(--bd-bg)" /><path d="M12 7.2V3.5M15.6 9.8l3.5-1.2M14.2 14l2.2 3.1M9.8 14l-2.2 3.1M8.4 9.8 4.9 8.6" stroke="var(--bd-bg)" strokeWidth="1.4" /></svg>;
export const IconSwap = (p: P) => <S {...p}><path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4" /></S>;
export const IconTactic = (p: P) => <S {...p}><path d="m4 4 4 4M8 4 4 8" /><circle cx="17" cy="19" r="2.3" /><path d="M17 3v6c0 2-1.5 3-3.5 3H9c-2 0-3 1.2-3 3v2" /><path d="m14.5 5.5 2.5-2.5 2.5 2.5M3.5 15l2.5 2.5L8.5 15" /></S>;
