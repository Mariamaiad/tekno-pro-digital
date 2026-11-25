
/* eslint-disable @next/next/no-img-element */

/** Marca principal da Tekno Pro Digital */
export function Logo({
  name,
  logoUrl,
  className = "",
}: {
  name: string;
  logoUrl?: string;
  className?: string;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={`h-9 w-auto object-contain ${className}`}
      />
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-8 w-8" />

      <span className="leading-none">
        <span className="block text-[1.05rem] font-semibold tracking-tight text-paper">
          Tekno Pro
        </span>
        <span className="mt-0.5 block text-[0.62rem] font-medium uppercase tracking-[0.32em] text-mist">
          Digital
        </span>
      </span>
    </span>
  );
}

/** Símbolo inspirado na identidade visual da Tekno Pro Digital */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M5 5H29L25 11H13L8 27H2L8 11H1L5 5Z"
        fill="#FFFFFF"
      />
      <path
        d="M13 13H29L25 19H20L15 27H8L15 15L13 13Z"
        fill="#087BFF"
      />
    </svg>
  );
}
