import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';

/* ------------------------------------------------------------------ */
/*  Google Fonts import via <style>                                    */
/* ------------------------------------------------------------------ */
const FontLoader: React.FC = () => (
  <style>
    {`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
    `}
  </style>
);

/* ------------------------------------------------------------------ */
/*  Palette                                                            */
/* ------------------------------------------------------------------ */
const C = {
  bg: '#0f0f23',
  accent: '#f0a500',
  white: '#ffffff',
  surface100: '#f5f4f0',
  muted: '#8888aa',
  cardBg: '#181830',
};

/* ------------------------------------------------------------------ */
/*  Geometric background pattern (CSS-only)                           */
/* ------------------------------------------------------------------ */
const GeometricBg: React.FC<{ opacity?: number }> = ({ opacity = 0.07 }) => (
  <AbsoluteFill
    style={{
      background: C.bg,
    }}
  >
    {/* Grid dots */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        backgroundImage: `radial-gradient(${C.accent} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }}
    />
    {/* Diagonal lines */}
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: opacity * 0.5,
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 80px,
          ${C.accent}22 80px,
          ${C.accent}22 81px
        )`,
      }}
    />
  </AbsoluteFill>
);

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */
const FactoryIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 120,
  color = C.accent,
}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <rect x="6" y="32" width="12" height="26" rx="2" fill={color} />
    <rect x="22" y="20" width="12" height="38" rx="2" fill={color} opacity={0.85} />
    <rect x="38" y="26" width="12" height="32" rx="2" fill={color} opacity={0.7} />
    <polygon points="12,32 22,20 22,32" fill={color} opacity={0.6} />
    <polygon points="28,20 38,26 38,20" fill={color} opacity={0.5} />
    <rect x="50" y="10" width="6" height="48" rx="1" fill={color} opacity={0.55} />
    <rect x="48" y="6" width="10" height="6" rx="2" fill={color} opacity={0.4} />
    {/* chimney smoke */}
    <circle cx="53" cy="4" r="2" fill={color} opacity={0.25} />
    <circle cx="56" cy="2" r="1.5" fill={color} opacity={0.15} />
    {/* base line */}
    <rect x="2" y="58" width="60" height="3" rx="1.5" fill={color} opacity={0.3} />
  </svg>
);

const ClipboardIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="12" y2="16" />
  </svg>
);

const WarningIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const DollarIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Scene 1 — Title Card (frames 0-120)                               */
/* ------------------------------------------------------------------ */
const Scene1Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scaleAnim = spring({ frame, fps, config: { damping: 60, stiffness: 80 } });
  const opacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const subtitleOpacity = interpolate(frame, [30, 55], [0, 1], { extrapolateRight: 'clamp' });
  const subtitleY = interpolate(frame, [30, 55], [30, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <GeometricBg opacity={0.06} />
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
          transform: `scale(${interpolate(scaleAnim, [0, 1], [0.85, 1])})`,
        }}
      >
        <FactoryIcon size={140} />
        <div style={{ height: 32 }} />
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 80,
            fontWeight: 700,
            color: C.white,
            letterSpacing: -1,
          }}
        >
          FMCG AI Platform
        </div>
        <div style={{ height: 16 }} />
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 34,
            fontWeight: 500,
            color: C.accent,
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleY}px)`,
          }}
        >
          Agentic Intelligence for Indian Exports
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 2 — The Problem (frames 120-240)                            */
/* ------------------------------------------------------------------ */
const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });

  // Animated counter 0 -> 35
  const counterVal = Math.round(
    interpolate(frame, [20, 70], [0, 35], { extrapolateRight: 'clamp' })
  );

  // Icons appearing one by one
  const icon1 = spring({ frame: frame - 40, fps, config: { damping: 50 } });
  const icon2 = spring({ frame: frame - 55, fps, config: { damping: 50 } });
  const icon3 = spring({ frame: frame - 70, fps, config: { damping: 50 } });

  // Amber accent line
  const lineWidth = interpolate(frame, [0, 40], [0, 600], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <GeometricBg opacity={0.05} />
      {/* Amber accent line */}
      <div
        style={{
          position: 'absolute',
          top: 200,
          left: '50%',
          transform: 'translateX(-50%)',
          width: lineWidth,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)`,
          borderRadius: 2,
        }}
      />
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 120px',
        }}
      >
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 40,
            fontWeight: 500,
            color: C.white,
            textAlign: 'center',
            lineHeight: 1.4,
            opacity: textOpacity,
            maxWidth: 1200,
          }}
        >
          Indian FMCG exporters manage quality, complaints,
          <br />
          and compliance across{' '}
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              fontSize: 52,
              color: C.accent,
            }}
          >
            {counterVal}+
          </span>{' '}
          countries
        </div>

        <div style={{ height: 80 }} />

        <div style={{ display: 'flex', gap: 100 }}>
          {[
            { Icon: ClipboardIcon, label: 'Quality', anim: icon1 },
            { Icon: WarningIcon, label: 'Complaints', anim: icon2 },
            { Icon: DollarIcon, label: 'Finance', anim: icon3 },
          ].map(({ Icon, label, anim }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                opacity: Math.max(0, anim),
                transform: `scale(${interpolate(Math.max(0, anim), [0, 1], [0.5, 1])})`,
              }}
            >
              <Icon size={64} />
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 22,
                  color: C.muted,
                  fontWeight: 500,
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 3 — Features (frames 240-390)                               */
/* ------------------------------------------------------------------ */
const FeatureCard: React.FC<{
  title: string;
  desc: string;
  delay: number;
}> = ({ title, desc, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slide = spring({ frame: frame - delay, fps, config: { damping: 40, stiffness: 60 } });
  const x = interpolate(Math.max(0, slide), [0, 1], [-600, 0]);
  const opacity = interpolate(Math.max(0, slide), [0, 1], [0, 1]);

  return (
    <div
      style={{
        transform: `translateX(${x}px)`,
        opacity,
        background: C.surface100,
        borderRadius: 16,
        padding: '36px 48px',
        width: 520,
        borderTop: `5px solid ${C.accent}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 28,
          fontWeight: 700,
          color: C.bg,
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 18,
          fontWeight: 400,
          color: '#555',
          lineHeight: 1.5,
        }}
      >
        {desc}
      </div>
    </div>
  );
};

const Scene3Features: React.FC = () => {
  return (
    <AbsoluteFill>
      <GeometricBg opacity={0.04} />
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 48,
          padding: '0 80px',
        }}
      >
        <FeatureCard
          title="AI Quality Audits"
          desc="Auto-generated checklists, CAPA reports, shelf-life prediction"
          delay={5}
        />
        <FeatureCard
          title="Smart Complaints"
          desc="AI classification, root cause analysis, regulatory notifications"
          delay={18}
        />
        <FeatureCard
          title="Export Finance"
          desc="HS code classification, FTA benefits, RoDTEP optimization"
          delay={31}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 4 — Stats (frames 390-510)                                  */
/* ------------------------------------------------------------------ */
const AnimatedStat: React.FC<{
  value: number;
  suffix: string;
  label: string;
  delay: number;
}> = ({ value, suffix, label, delay }) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [delay, delay + 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const displayVal = Math.round(value * progress);

  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 72,
          fontWeight: 700,
          color: C.accent,
        }}
      >
        {displayVal}
        {suffix}
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 22,
          fontWeight: 500,
          color: C.white,
          textAlign: 'center',
        }}
      >
        {label}
      </div>
    </div>
  );
};

const Scene4Stats: React.FC = () => {
  return (
    <AbsoluteFill>
      <GeometricBg opacity={0.05} />
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 120,
        }}
      >
        <AnimatedStat value={40} suffix="+" label="AI-Powered Endpoints" delay={5} />
        <AnimatedStat value={3} suffix="" label="Specialized AI Agents" delay={15} />
        <AnimatedStat value={35} suffix="+" label="Export Markets Supported" delay={25} />
        <AnimatedStat value={98} suffix="/100" label="QA Health Score" delay={35} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Scene 5 — CTA (frames 510-600)                                    */
/* ------------------------------------------------------------------ */
const Scene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [70, 90], [1, 0], { extrapolateRight: 'clamp' });
  const opacity = Math.min(fadeIn, fadeOut);

  const btnSpring = spring({ frame: frame - 20, fps, config: { damping: 40, stiffness: 70 } });
  const btnScale = interpolate(Math.max(0, btnSpring), [0, 1], [0.7, 1]);

  return (
    <AbsoluteFill>
      <GeometricBg opacity={0.06} />
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
        }}
      >
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 56,
            fontWeight: 700,
            color: C.white,
            marginBottom: 20,
          }}
        >
          Built for Indian FMCG Exporters
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 28,
            fontWeight: 400,
            color: C.muted,
            letterSpacing: 6,
            marginBottom: 60,
          }}
        >
          Quality &middot; Complaints &middot; Finance
        </div>
        <div
          style={{
            transform: `scale(${btnScale})`,
            background: `linear-gradient(135deg, ${C.accent}, #d48f00)`,
            padding: '22px 72px',
            borderRadius: 60,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 30,
            fontWeight: 700,
            color: C.bg,
            boxShadow: `0 0 40px ${C.accent}44`,
          }}
        >
          Get Started
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Main Composition                                                   */
/* ------------------------------------------------------------------ */
export const FMCGPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      <FontLoader />

      {/* Scene 1: Title (0-4s) */}
      <Sequence from={0} durationInFrames={120}>
        <Scene1Title />
      </Sequence>

      {/* Scene 2: Problem (4-8s) */}
      <Sequence from={120} durationInFrames={120}>
        <Scene2Problem />
      </Sequence>

      {/* Scene 3: Features (8-13s) */}
      <Sequence from={240} durationInFrames={150}>
        <Scene3Features />
      </Sequence>

      {/* Scene 4: Stats (13-17s) */}
      <Sequence from={390} durationInFrames={120}>
        <Scene4Stats />
      </Sequence>

      {/* Scene 5: CTA (17-20s) */}
      <Sequence from={510} durationInFrames={90}>
        <Scene5CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
