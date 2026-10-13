const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
};

export const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" strokeWidth="2.2" {...base}>
    <path d="M3 8.5l3.2 3L13 4.5" />
  </svg>
);

export const CrossIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" strokeWidth="2.2" {...base}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2" {...base}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </svg>
);

export const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2" {...base}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
);

export const ExternalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2" {...base}>
    <path d="M14 4h6v6" />
    <path d="M20 4l-9 9" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

export const ClipIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" strokeWidth="2" {...base}>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

export const UploadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="1.8" {...base}>
    <path d="M12 16V4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </svg>
);

export const FileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="1.8" {...base}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </svg>
);
