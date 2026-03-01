/**
 * Official Mistral AI M icon — derived from mistral.ai/brand asset kit.
 * Rainbow variant uses the 5 brand gradient colors (yellow → red).
 */
export function MistralLogo({ className, variant = 'rainbow' }: { className?: string; variant?: 'rainbow' | 'orange' | 'white' }) {
  if (variant === 'orange') {
    return (
      <svg className={className} viewBox="0 0 191 135" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M54.322 0H27.153v27.089h27.17V0Z" fill="#FA500F"/>
        <path d="M162.984 0h-27.17v27.089h27.17V0Z" fill="#FA500F"/>
        <path d="M81.482 27.091H27.153v27.09h54.33v-27.09Z" fill="#FA500F"/>
        <path d="M162.99 27.091h-54.33v27.09h54.33v-27.09Z" fill="#FA500F"/>
        <path d="M162.972 54.168H27.153v27.089h135.82V54.168Z" fill="#FA500F"/>
        <path d="M54.322 81.259H27.153v27.09h27.17v-27.09Z" fill="#FA500F"/>
        <path d="M108.661 81.259H81.492v27.09h27.17v-27.09Z" fill="#FA500F"/>
        <path d="M162.984 81.259h-27.17v27.09h27.17v-27.09Z" fill="#FA500F"/>
        <path d="M81.488 108.339H0v27.09h81.488v-27.09Z" fill="#FA500F"/>
        <path d="M190.159 108.339h-81.498v27.09h81.498v-27.09Z" fill="#FA500F"/>
      </svg>
    );
  }

  if (variant === 'white') {
    return (
      <svg className={className} viewBox="0 0 191 135" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M54.322 0H27.153v27.089h27.17V0Z" fill="currentColor"/>
        <path d="M162.984 0h-27.17v27.089h27.17V0Z" fill="currentColor"/>
        <path d="M81.482 27.091H27.153v27.09h54.33v-27.09Z" fill="currentColor"/>
        <path d="M162.99 27.091h-54.33v27.09h54.33v-27.09Z" fill="currentColor"/>
        <path d="M162.972 54.168H27.153v27.089h135.82V54.168Z" fill="currentColor"/>
        <path d="M54.322 81.259H27.153v27.09h27.17v-27.09Z" fill="currentColor"/>
        <path d="M108.661 81.259H81.492v27.09h27.17v-27.09Z" fill="currentColor"/>
        <path d="M162.984 81.259h-27.17v27.09h27.17v-27.09Z" fill="currentColor"/>
        <path d="M81.488 108.339H0v27.09h81.488v-27.09Z" fill="currentColor"/>
        <path d="M190.159 108.339h-81.498v27.09h81.498v-27.09Z" fill="currentColor"/>
      </svg>
    );
  }

  // Rainbow — official brand colors
  return (
    <svg className={className} viewBox="0 0 191 135" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M54.322 0H27.153v27.089h27.17V0Z" fill="#FFD800"/>
      <path d="M162.984 0h-27.17v27.089h27.17V0Z" fill="#FFD800"/>
      <path d="M81.482 27.091H27.153v27.09h54.33v-27.09Z" fill="#FFAF00"/>
      <path d="M162.99 27.091h-54.33v27.09h54.33v-27.09Z" fill="#FFAF00"/>
      <path d="M162.972 54.168H27.153v27.089h135.82V54.168Z" fill="#FF8205"/>
      <path d="M54.322 81.259H27.153v27.09h27.17v-27.09Z" fill="#FA500F"/>
      <path d="M108.661 81.259H81.492v27.09h27.17v-27.09Z" fill="#FA500F"/>
      <path d="M162.984 81.259h-27.17v27.09h27.17v-27.09Z" fill="#FA500F"/>
      <path d="M81.488 108.339H0v27.09h81.488v-27.09Z" fill="#E10500"/>
      <path d="M190.159 108.339h-81.498v27.09h81.498v-27.09Z" fill="#E10500"/>
    </svg>
  );
}
