export function VistralLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 7 5" className={className} shapeRendering="crispEdges">
      {/* Row 0 — wide top extending out */}
      <rect x="0" y="0" width="2" height="1" fill="#FFD800"/>
      <rect x="5" y="0" width="2" height="1" fill="#FFD800"/>
      {/* Row 1 — narrowing */}
      <rect x="1" y="1" width="2" height="1" fill="#FFAF00"/>
      <rect x="4" y="1" width="2" height="1" fill="#FFAF00"/>
      {/* Row 2 — coming together */}
      <rect x="2" y="2" width="1" height="1" fill="#FF8205"/>
      <rect x="4" y="2" width="1" height="1" fill="#FF8205"/>
      {/* Row 3 — merging */}
      <rect x="2" y="3" width="3" height="1" fill="#FA500F"/>
      {/* Row 4 — single point */}
      <rect x="3" y="4" width="1" height="1" fill="#E10500"/>
    </svg>
  );
}
