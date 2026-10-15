import type { LandscapeScene } from "@/lib/placeVisuals";

const palettes: Record<LandscapeScene, { sky: string; horizon: string; ground: string; skyline: string }> = {
  coast: { sky: "#a9dbeb", horizon: "#cfe8e5", ground: "#4e9ebb", skyline: "#2e637d" },
  desert: { sky: "#f3dcb2", horizon: "#f5deb3", ground: "#ce9861", skyline: "#9e6c47" },
  mountain: { sky: "#c1d9df", horizon: "#e3e8e1", ground: "#859da5", skyline: "#456a76" },
  highland: { sky: "#d1e9df", horizon: "#e8eacf", ground: "#88ab8d", skyline: "#54856b" },
  river: { sky: "#d9e3e3", horizon: "#f0e8d8", ground: "#7ca9b7", skyline: "#456e7c" },
  city: { sky: "#c7dde7", horizon: "#eff0e6", ground: "#98b7bf", skyline: "#55747f" },
};

export function PlaceIllustration({ scene, label, badge }: { scene: LandscapeScene; label: string; badge?: string }) {
  const colors = palettes[scene];
  return (
    <div className={"place-illustration place-illustration--" + scene} role="img" aria-label={"رسم رمزي لمعالم " + label}>
      <svg viewBox="0 0 460 186" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <rect width="460" height="186" fill={colors.sky} />
        <circle cx="371" cy="44" r="22" fill="#fff7d8" opacity=".94" />
        <path d="M0 112 Q75 105 146 114 T290 108 T460 110 L460 186 H0Z" fill={colors.horizon} />
        {scene === "mountain" ? (
          <>
            <path d="M-30 164L80 63L144 128L238 43L355 158L410 79L490 162V186H-30Z" fill="#748f9c" />
            <path d="M53 88L80 63L110 95 M215 69L238 43L266 78 M391 97L410 79L432 107" fill="none" stroke="#f4f5f3" strokeWidth="11" strokeLinejoin="round" />
          </>
        ) : scene === "desert" ? (
          <>
            <path d="M0 147Q95 73 190 129T460 113V186H0Z" fill="#dfb077" />
            <path d="M0 171Q110 125 210 161T460 141V186H0Z" fill={colors.ground} />
            <path d="M343 141v-39m-12 25q12 2 12-17m0 13q14 0 14-17" fill="none" stroke="#8a7553" strokeWidth="5" strokeLinecap="round" />
          </>
        ) : scene === "highland" ? (
          <>
            <path d="M0 140Q70 91 148 137T300 131T460 117V186H0Z" fill="#98b99c" />
            <path d="M0 169Q116 125 204 155T460 143V186H0Z" fill={colors.ground} />
          </>
        ) : (
          <>
            <path d="M0 131Q90 116 174 133T340 123T460 133V186H0Z" fill={colors.ground} />
            <path d="M0 151Q70 142 127 151T263 148T460 153" fill="none" stroke="#edf9f5" strokeWidth="3" opacity=".65" />
          </>
        )}
        {(scene === "coast" || scene === "river" || scene === "city") && (
          <g fill={colors.skyline} opacity=".95">
            <rect x="53" y="109" width="31" height="38" rx="2" />
            <rect x="96" y="87" width="34" height="60" rx="2" />
            <rect x="137" y="102" width="23" height="45" rx="2" />
            <rect x="170" y="75" width="29" height="72" rx="2" />
            <rect x="208" y="94" width="39" height="53" rx="2" />
            <rect x="258" y="84" width="31" height="63" rx="2" />
            <rect x="297" y="107" width="27" height="40" rx="2" />
            <rect x="335" y="90" width="29" height="57" rx="2" />
          </g>
        )}
        {(scene === "coast" || scene === "river") && (
          <path d="M0 160Q70 148 126 160T254 158T460 159" stroke="#effbfc" strokeWidth="3" opacity=".75" fill="none" />
        )}
      </svg>
      <span className="place-illustration__tag">{badge ?? "مرصد الأطلس"}</span>
    </div>
  );
}
