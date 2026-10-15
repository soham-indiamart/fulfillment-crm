import type { ReactNode } from 'react';

interface IconProps {
  size: number;
  viewBox: string;
  strokeWidth: number;
  children: ReactNode;
}

/** Decorative stroke icon; the label always comes from the surrounding text or aria-label. */
function Icon({ size, viewBox, strokeWidth, children }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const CheckIcon = () => (
  <Icon size={16} viewBox="0 0 16 16" strokeWidth={2.2}>
    <path d="M3 8.5l3.2 3L13 4.5" />
  </Icon>
);

export const CrossIcon = () => (
  <Icon size={16} viewBox="0 0 16 16" strokeWidth={2.2}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Icon>
);

export const PhoneIcon = () => (
  <Icon size={14} viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </Icon>
);

export const RefreshIcon = () => (
  <Icon size={14} viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </Icon>
);

export const ExternalIcon = () => (
  <Icon size={14} viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M14 4h6v6" />
    <path d="M20 4l-9 9" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Icon>
);

export const ClipIcon = () => (
  <Icon size={12} viewBox="0 0 24 24" strokeWidth={2}>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </Icon>
);

export const UploadIcon = () => (
  <Icon size={22} viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M12 16V4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </Icon>
);

export const FileIcon = () => (
  <Icon size={20} viewBox="0 0 24 24" strokeWidth={1.8}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </Icon>
);
