import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CountryData {
  customer_country: string;
  count: number;
  top_category?: string;
}

interface WorldMapProps {
  data: CountryData[];
}

const COUNTRY_INFO: Record<string, { name: string; x: number; y: number }> = {
  UK: { name: 'United Kingdom', x: 160, y: 40 },
  DE: { name: 'Germany', x: 260, y: 40 },
  FR: { name: 'France', x: 360, y: 40 },
  NL: { name: 'Netherlands', x: 460, y: 40 },
  QA: { name: 'Qatar', x: 210, y: 120 },
  UAE: { name: 'United Arab Emirates', x: 330, y: 120 },
  SA: { name: 'Saudi Arabia', x: 450, y: 120 },
  SG: { name: 'Singapore', x: 530, y: 180 },
  US: { name: 'United States', x: 80, y: 200 },
  CA: { name: 'Canada', x: 200, y: 200 },
  AU: { name: 'Australia', x: 530, y: 260 },
  KE: { name: 'Kenya', x: 200, y: 280 },
  ZA: { name: 'South Africa', x: 310, y: 280 },
  MY: { name: 'Malaysia', x: 400, y: 330 },
  TH: { name: 'Thailand', x: 480, y: 330 },
  JP: { name: 'Japan', x: 560, y: 330 },
  KR: { name: 'South Korea', x: 640, y: 330 },
};

function getColor(count: number): string {
  if (count === 0) return '#374151'; // gray
  if (count <= 2) return '#fbbf24'; // amber
  return '#ef4444'; // red/danger
}

function getTextColor(count: number): string {
  if (count === 0) return '#9ca3af';
  if (count <= 2) return '#1a1a2e';
  return '#ffffff';
}

export default function WorldMap({ data }: WorldMapProps) {
  const navigate = useNavigate();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const dataMap: Record<string, CountryData> = {};
  (data || []).forEach(d => {
    dataMap[d.customer_country] = d;
  });

  return (
    <div className="relative">
      <svg
        viewBox="0 0 720 380"
        className="w-full h-auto"
        style={{ background: 'var(--surface-800, #1a1a2e)', borderRadius: '12px' }}
      >
        {/* Title */}
        <text x="360" y="24" textAnchor="middle" fill="#a8a49a" fontSize="11" fontFamily="DM Sans, sans-serif">
          Export Markets — Complaint Density
        </text>

        {/* Connection lines from center (India) */}
        {Object.entries(COUNTRY_INFO).map(([code, info]) => (
          <line
            key={`line-${code}`}
            x1="360"
            y1="180"
            x2={info.x + 30}
            y2={info.y + 14}
            stroke="#374151"
            strokeWidth="0.5"
            strokeDasharray="4 4"
            opacity="0.4"
          />
        ))}

        {/* India center node */}
        <rect x="335" y="160" width="50" height="28" rx="6" fill="#f0a500" opacity="0.9" />
        <text x="360" y="178" textAnchor="middle" fill="#1a1a2e" fontSize="11" fontWeight="bold" fontFamily="Space Mono, monospace">
          IN
        </text>

        {/* Country nodes */}
        {Object.entries(COUNTRY_INFO).map(([code, info]) => {
          const d = dataMap[code];
          const count = d?.count || 0;
          const bgColor = getColor(count);
          const txtColor = getTextColor(count);
          const width = code.length > 2 ? 46 : 40;

          return (
            <g
              key={code}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/complaints?country=${code}`)}
              onMouseEnter={(e) => {
                const name = info.name;
                const cat = d?.top_category || 'N/A';
                setTooltip({
                  x: info.x + width / 2,
                  y: info.y - 10,
                  content: `${name}: ${count} complaint${count !== 1 ? 's' : ''} | Top: ${cat}`,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <rect
                x={info.x}
                y={info.y}
                width={width}
                height="28"
                rx="6"
                fill={bgColor}
                opacity={count > 0 ? 0.9 : 0.4}
                stroke={count > 2 ? '#fca5a5' : 'transparent'}
                strokeWidth="1"
              />
              <text
                x={info.x + width / 2}
                y={info.y + 15}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={txtColor}
                fontSize="10"
                fontWeight="bold"
                fontFamily="Space Mono, monospace"
              >
                {code}
              </text>
              {count > 0 && (
                <text
                  x={info.x + width / 2}
                  y={info.y + 24}
                  textAnchor="middle"
                  fill={txtColor}
                  fontSize="7"
                  fontFamily="Space Mono, monospace"
                  opacity="0.8"
                >
                  {count}
                </text>
              )}
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={tooltip.x - 120}
              y={tooltip.y - 24}
              width="240"
              height="22"
              rx="4"
              fill="#0f0f23"
              stroke="#374151"
              strokeWidth="1"
            />
            <text
              x={tooltip.x}
              y={tooltip.y - 10}
              textAnchor="middle"
              fill="#e8e6df"
              fontSize="9"
              fontFamily="DM Sans, sans-serif"
            >
              {tooltip.content}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
