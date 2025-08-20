"use client";
import { TileImage } from "@/components/TileImage";

const knownGood = [
  {
    label: "Placeholder.com",
    src: "https://via.placeholder.com/300x450.png",
    alt: "Known Good Placeholder"
  },
  {
    label: "TMDB Sample",
    src: "/t/p/w300/8Y43POKjjKDGI9MH89NW0NAzzp8.jpg",
    alt: "TMDB Sample"
  }
];

// Example: Replace with your real home page items mapping
const realItems: { src?: string | null; alt: string }[] = [
  // { src: ..., alt: ... },
];

export default function SelfTestPage() {
  // For demo, just use knownGood and empty realItems
  return (
    <div style={{ padding: 24 }}>
      <h1>Self-Diagnostic: Image Pipeline</h1>
      <p>If row 1 shows images, networking & proxy are fine. If row 2 is blank, your data map is empty or the grid is hidden by CSS.</p>
      <div>
        <h2>Row 1: Known Good</h2>
        <div style={{ display: 'flex', gap: 16 }}>
          {knownGood.map((item, i) => (
            <div className="tile" key={i}>
              <TileImage src={item.src} alt={item.alt} />
              <div style={{ textAlign: 'center', fontSize: 12 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2>Row 2: Real Home Page Items</h2>
        {realItems.length === 0 ? (
          <div style={{ color: 'red', fontWeight: 600 }}>No items (data source returned 0).</div>
        ) : (
          <div style={{ display: 'flex', gap: 16 }}>
            {realItems.map((item, i) => (
              <div className="tile" key={i}>
                <TileImage src={item.src} alt={item.alt} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h2>Row 3: No-src (should show placeholder)</h2>
        <div style={{ display: 'flex', gap: 16 }}>
          <div className="tile">
            <TileImage src={undefined} alt="No Image" />
          </div>
        </div>
      </div>
    </div>
  );
}
