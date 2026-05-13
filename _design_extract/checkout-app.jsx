const { useState, useMemo, useEffect } = React;

// ============================================================
// CHIBI MASCOT — simple anime-style figure built from primitives.
// Pointing right toward the CTA button.
// Palette: black / red / white only.
// ============================================================
function ChibiMascot(){
  // Manga-style chibi girl, 3-head proportions, dynamic spiky hair,
  // sparkly oversized eyes, pointing toward the CTA on the right.
  // Strict palette: black / red / white. Clean linework with line weights.
  return (
    <svg viewBox="0 0 220 320" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <clipPath id="face-clip">
          <path d="M40 120
                   C 40 78, 64 50, 100 50
                   C 138 50, 164 80, 164 120
                   C 164 158, 138 184, 100 184
                   C 64 184, 40 158, 40 120 Z"/>
        </clipPath>
        <linearGradient id="hairGloss" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".28"/>
          <stop offset=".55" stopColor="#fff" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* speed / action lines behind */}
      <g stroke="#0c0c0c" strokeWidth="2" strokeLinecap="round" opacity=".35">
        <line x1="6"   y1="46"  x2="22"  y2="58"/>
        <line x1="190" y1="46"  x2="174" y2="58"/>
        <line x1="2"   y1="100" x2="18"  y2="100"/>
        <line x1="200" y1="100" x2="184" y2="100"/>
        <line x1="10"  y1="160" x2="24"  y2="150"/>
      </g>

      {/* ============ BODY ============ */}
      {/* skirt (pleated) */}
      <path d="M58 232 L 142 232 L 156 286 L 44 286 Z"
            fill="#0c0c0c" stroke="#0c0c0c" strokeWidth="3" strokeLinejoin="round"/>
      <g stroke="#fff" strokeWidth="1.5" opacity=".55">
        <line x1="72" y1="234" x2="60"  y2="284"/>
        <line x1="88" y1="234" x2="80"  y2="284"/>
        <line x1="104" y1="234" x2="100" y2="284"/>
        <line x1="120" y1="234" x2="120" y2="284"/>
        <line x1="136" y1="234" x2="140" y2="284"/>
      </g>

      {/* legs */}
      <rect x="74"  y="284" width="14" height="22" fill="#fff" stroke="#0c0c0c" strokeWidth="3"/>
      <rect x="112" y="284" width="14" height="22" fill="#fff" stroke="#0c0c0c" strokeWidth="3"/>
      {/* shoes */}
      <path d="M68 306 L 96 306 L 96 314 L 68 314 Z" fill="#e1251b" stroke="#0c0c0c" strokeWidth="3"/>
      <path d="M106 306 L 134 306 L 134 314 L 106 314 Z" fill="#e1251b" stroke="#0c0c0c" strokeWidth="3"/>

      {/* sailor uniform shirt */}
      <path d="M52 196
               C 52 184, 70 178, 100 178
               C 130 178, 148 184, 148 196
               L 152 232
               C 152 236, 148 238, 144 238
               L 56 238
               C 52 238, 48 236, 48 232 Z"
            fill="#fff" stroke="#0c0c0c" strokeWidth="3.5" strokeLinejoin="round"/>

      {/* sailor collar (red — manga touch) */}
      <path d="M70 180 L 100 200 L 130 180 L 144 196 L 100 224 L 56 196 Z"
            fill="#e1251b" stroke="#0c0c0c" strokeWidth="3" strokeLinejoin="round"/>
      {/* collar stripes */}
      <path d="M74 184 L 100 202 L 126 184" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".7"/>
      <path d="M70 192 L 100 212 L 130 192" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".7"/>

      {/* ribbon (front, classic seifuku) */}
      <path d="M88 206 L 100 218 L 112 206 L 108 226 L 92 226 Z"
            fill="#0c0c0c" stroke="#0c0c0c" strokeWidth="2.5" strokeLinejoin="round"/>
      <circle cx="100" cy="216" r="3" fill="#e1251b"/>

      {/* ============ LEFT ARM (relaxed by side) ============ */}
      <path d="M54 196 C 38 210, 30 230, 36 252 C 38 258, 46 260, 50 254 C 56 232, 62 218, 68 206 Z"
            fill="#fff" stroke="#0c0c0c" strokeWidth="3.5" strokeLinejoin="round"/>
      <circle cx="44" cy="254" r="8" fill="#fff" stroke="#0c0c0c" strokeWidth="3"/>

      {/* ============ RIGHT ARM (POINTING to button) ============ */}
      {/* shoulder + upper arm */}
      <path d="M148 196
               C 168 188, 190 188, 204 196
               L 208 212
               C 196 210, 178 212, 156 218 Z"
            fill="#fff" stroke="#0c0c0c" strokeWidth="3.5" strokeLinejoin="round"/>
      {/* forearm extending out */}
      <path d="M196 196 L 214 200 L 214 216 L 196 216 Z"
            fill="#fff" stroke="#0c0c0c" strokeWidth="3.5" strokeLinejoin="round"/>

      {/* pointing fist */}
      <g transform="translate(212 208)">
        <circle cx="0" cy="0" r="10" fill="#fff" stroke="#0c0c0c" strokeWidth="3"/>
        {/* knuckle lines */}
        <path d="M-4 -6 Q -2 -3 -4 0 M0 -7 Q 2 -3 0 0 M4 -6 Q 6 -3 4 0"
              fill="none" stroke="#0c0c0c" strokeWidth="1.5" strokeLinecap="round" opacity=".7"/>
        {/* index finger pointing right */}
        <path d="M6 -5 L 20 -5 C 24 -5, 24 5, 20 5 L 6 5 Z"
              fill="#fff" stroke="#0c0c0c" strokeWidth="3" strokeLinejoin="round"/>
        {/* fingertip detail */}
        <path d="M22 -2 Q 24 0 22 2" stroke="#0c0c0c" strokeWidth="2" strokeLinecap="round" fill="none"/>
        {/* impact / emphasis lines around the finger */}
        <g stroke="#0c0c0c" strokeWidth="2.5" strokeLinecap="round">
          <line x1="28" y1="-10" x2="34" y2="-14"/>
          <line x1="30" y1="0"   x2="38" y2="0"/>
          <line x1="28" y1="10"  x2="34" y2="14"/>
        </g>
      </g>

      {/* ============ NECK ============ */}
      <path d="M88 174 L 88 188 L 112 188 L 112 174 Z"
            fill="#fff" stroke="#0c0c0c" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M88 180 Q 100 184 112 180" fill="none" stroke="#0c0c0c" strokeWidth="1.5" opacity=".4"/>

      {/* ============ HEAD ============ */}
      {/* face base (skin = white) */}
      <path d="M40 120
               C 40 78, 64 50, 100 50
               C 138 50, 164 80, 164 120
               C 164 158, 138 184, 100 184
               C 64 184, 40 158, 40 120 Z"
            fill="#fff" stroke="#0c0c0c" strokeWidth="3.5" strokeLinejoin="round"/>

      {/* ===== HAIR ===== */}
      {/* back/long hair flowing behind shoulders */}
      <path d="M30 110
               C 26 70, 56 24, 100 22
               C 144 24, 174 70, 170 110
               L 178 200
               L 154 196
               L 150 130
               C 142 110, 126 100, 100 100
               C 74 100, 58 110, 50 130
               L 46 196
               L 22 200 Z"
            fill="#0c0c0c"/>

      {/* twin side bangs (long sidelocks) */}
      <path d="M38 110 L 30 196 L 50 192 L 56 116 Z" fill="#0c0c0c"/>
      <path d="M162 110 L 170 196 L 150 192 L 144 116 Z" fill="#0c0c0c"/>

      {/* spiky front bangs — classic anime */}
      <g clipPath="url(#face-clip)">
        <path d="M30 60
                 L 44 110
                 L 50 70
                 L 64 116
                 L 74 70
                 L 86 118
                 L 100 66
                 L 116 118
                 L 128 70
                 L 138 118
                 L 152 70
                 L 158 110
                 L 172 60
                 L 172 30
                 L 30 30 Z"
              fill="#0c0c0c"/>
        {/* glossy highlight band */}
        <path d="M50 56 L 154 56 L 150 78 L 54 78 Z" fill="url(#hairGloss)"/>
        {/* a few stray strands */}
        <path d="M70 100 L 76 124 L 80 102 Z" fill="#0c0c0c"/>
        <path d="M120 100 L 124 124 L 128 102 Z" fill="#0c0c0c"/>
      </g>

      {/* ahoge (signature anime cowlick) */}
      <path d="M96 28 Q 98 8 108 14 Q 104 22 102 32 Z" fill="#0c0c0c"/>

      {/* hair ribbon */}
      <g transform="translate(46 76) rotate(-18)">
        <path d="M-14 -6 L 0 0 L -14 6 Z" fill="#e1251b" stroke="#0c0c0c" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M14 -6 L 0 0 L 14 6 Z" fill="#e1251b" stroke="#0c0c0c" strokeWidth="2" strokeLinejoin="round"/>
        <circle cx="0" cy="0" r="3.5" fill="#e1251b" stroke="#0c0c0c" strokeWidth="2"/>
      </g>

      {/* ===== EYES (big, sparkly, manga) ===== */}
      {/* lash line / upper lid */}
      <path d="M52 110 Q 60 102 80 108" fill="none" stroke="#0c0c0c" strokeWidth="4" strokeLinecap="round"/>
      <path d="M120 108 Q 140 102 148 110" fill="none" stroke="#0c0c0c" strokeWidth="4" strokeLinecap="round"/>
      {/* outer lashes */}
      <path d="M52 110 L 48 106 M55 108 L 53 102" stroke="#0c0c0c" strokeWidth="2" strokeLinecap="round"/>
      <path d="M148 110 L 152 106 M145 108 L 147 102" stroke="#0c0c0c" strokeWidth="2" strokeLinecap="round"/>

      {/* left eye */}
      <ellipse cx="68" cy="128" rx="13" ry="17" fill="#fff" stroke="#0c0c0c" strokeWidth="3"/>
      <ellipse cx="68" cy="130" rx="11" ry="14" fill="#0c0c0c"/>
      <ellipse cx="68" cy="132" rx="7" ry="10" fill="#e1251b"/>
      {/* eye shines */}
      <ellipse cx="72" cy="124" rx="3.5" ry="4.5" fill="#fff"/>
      <circle cx="64" cy="136" r="2" fill="#fff"/>
      <circle cx="74" cy="138" r="1.2" fill="#fff" opacity=".7"/>

      {/* right eye */}
      <ellipse cx="132" cy="128" rx="13" ry="17" fill="#fff" stroke="#0c0c0c" strokeWidth="3"/>
      <ellipse cx="132" cy="130" rx="11" ry="14" fill="#0c0c0c"/>
      <ellipse cx="132" cy="132" rx="7" ry="10" fill="#e1251b"/>
      <ellipse cx="136" cy="124" rx="3.5" ry="4.5" fill="#fff"/>
      <circle cx="128" cy="136" r="2" fill="#fff"/>
      <circle cx="138" cy="138" r="1.2" fill="#fff" opacity=".7"/>

      {/* eyebrows (peeking through hair) */}
      <path d="M56 100 Q 64 96 80 100" fill="none" stroke="#0c0c0c" strokeWidth="3" strokeLinecap="round"/>
      <path d="M120 100 Q 136 96 144 100" fill="none" stroke="#0c0c0c" strokeWidth="3" strokeLinecap="round"/>

      {/* nose (subtle) */}
      <path d="M100 144 Q 102 150 100 154" fill="none" stroke="#0c0c0c" strokeWidth="2" strokeLinecap="round"/>

      {/* mouth — open little smile (cheering) */}
      <path d="M92 162 Q 100 174 110 162" fill="#0c0c0c" stroke="#0c0c0c" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M93 163 Q 100 170 109 163" fill="#e1251b" opacity=".9"/>

      {/* cheeks (manga blush — three small lines) */}
      <g stroke="#e1251b" strokeWidth="2" strokeLinecap="round">
        <line x1="50" y1="148" x2="58" y2="148"/>
        <line x1="52" y1="152" x2="60" y2="152"/>
        <line x1="50" y1="156" x2="58" y2="156"/>
      </g>
      <g stroke="#e1251b" strokeWidth="2" strokeLinecap="round">
        <line x1="142" y1="148" x2="150" y2="148"/>
        <line x1="140" y1="152" x2="148" y2="152"/>
        <line x1="142" y1="156" x2="150" y2="156"/>
      </g>

      {/* sparkle stars (excited atmosphere) */}
      <g fill="#e1251b" stroke="#0c0c0c" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M20 76 L 23 82 L 29 84 L 23 86 L 20 92 L 17 86 L 11 84 L 17 82 Z"/>
        <path d="M186 32 L 188 36 L 192 38 L 188 40 L 186 44 L 184 40 L 180 38 L 184 36 Z"/>
      </g>

    </svg>
  );
}


const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#e63329",
  "panelStyle": "manga",
  "mascotPose": "point",
  "showSFX": true,
  "showRecommended": true,
  "totalSpent": 720,
  "ordersPlaced": 6
}/*EDITMODE-END*/;

// Tier thresholds (spend in €)
const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold:   1200
};

function tierFromSpend(spent){
  if(spent >= TIER_THRESHOLDS.gold)   return "gold";
  if(spent >= TIER_THRESHOLDS.silver) return "silver";
  return "bronze";
}

// ============================================================
// LOYALTY TIERS
// ============================================================
const TIERS = {
  bronze: {
    key:"bronze", label:"BRONZO", color:"#a86b3c",
    shippingFree: 50,           // free shipping threshold
    autoPct: 0,                 // automatic discount %
    intro: null,                // intro discount on first N orders
    perks:[
      {ico:"◆", t:"Spedizione gratis sopra €50"},
      {ico:"◆", t:"Accesso al catalogo standard"},
      {ico:"◆", t:"Newsletter & anteprime"}
    ]
  },
  silver: {
    key:"silver", label:"SILVER", color:"#9ea3ab",
    shippingFree: 10,
    autoPct: 0,
    intro: { firstOrders: 5, pct: 0.10 },
    perks:[
      {ico:"★", t:"Spedizione gratis sopra €10"},
      {ico:"★", t:"−10% sui primi 5 ordini"},
      {ico:"★", t:"Accesso pre-order anticipato"}
    ]
  },
  gold: {
    key:"gold", label:"GOLD", color:"#e1251b",
    shippingFree: 0,            // always free
    autoPct: 0,
    intro: [
      { firstOrders: 5,  pct: 0.15 },
      { firstOrders: 15, pct: 0.10 }   // orders 6–15
    ],
    perks:[
      {ico:"☘", t:"Spedizione sempre gratis"},
      {ico:"☘", t:"−15% sui primi 5 ordini"},
      {ico:"☘", t:"−10% sui successivi 10 ordini"},
      {ico:"☘", t:"Edizioni esclusive Gold"}
    ]
  }
};

function tierIntroDiscount(tier, ordersPlaced){
  // Returns the pct discount applied to the NEXT order (ordersPlaced is 0-based count of past orders)
  const def = TIERS[tier];
  if(!def || !def.intro) return 0;
  const arr = Array.isArray(def.intro) ? def.intro : [def.intro];
  // Iterate from highest-priority (lowest firstOrders) to lower
  const sorted = [...arr].sort((a,b)=>a.firstOrders - b.firstOrders);
  for(const rule of sorted){
    if(ordersPlaced < rule.firstOrders) return rule.pct;
  }
  return 0;
}
function tierRemainingAtPct(tier, ordersPlaced, pct){
  const def = TIERS[tier];
  if(!def || !def.intro) return 0;
  const arr = Array.isArray(def.intro) ? def.intro : [def.intro];
  const sorted = [...arr].sort((a,b)=>a.firstOrders - b.firstOrders);
  let prev = 0;
  for(const rule of sorted){
    if(rule.pct === pct){
      return Math.max(0, rule.firstOrders - Math.max(ordersPlaced, prev));
    }
    prev = rule.firstOrders;
  }
  return 0;
}

// ============================================================
// TIER STRIP — sticky badge at top of cart showing user level + perks
// ============================================================
function TierStrip({ tier, tierKey, ordersPlaced, tierPct, totalSpent }){
  // figure out next-tier progress
  const order = ["bronze","silver","gold"];
  const idx = order.indexOf(tierKey);
  const nextKey = idx < order.length - 1 ? order[idx+1] : null;
  const currentThreshold = TIER_THRESHOLDS[tierKey];
  const nextThreshold = nextKey ? TIER_THRESHOLDS[nextKey] : null;
  const span = nextThreshold ? (nextThreshold - currentThreshold) : 1;
  const progressPct = nextThreshold
    ? Math.min(100, ((totalSpent - currentThreshold) / span) * 100)
    : 100;
  // overall progress for the multi-stop bar (0 → gold threshold)
  const overallPct = Math.min(100, (totalSpent / TIER_THRESHOLDS.gold) * 100);

  // build progress for intro discount
  const intro = tier.intro;
  const introArr = !intro ? [] : Array.isArray(intro) ? intro : [intro];
  const sortedIntro = [...introArr].sort((a,b)=>a.firstOrders - b.firstOrders);

  return (
    <div className={"tier tier-"+tierKey}>
      <div className="tier-medal">
        <svg viewBox="0 0 80 80" width="64" height="64" aria-hidden="true">
          <defs>
            <linearGradient id={"medal-"+tierKey} x1="0" x2="1" y1="0" y2="1">
              {tierKey==="bronze" && <>
                <stop offset="0" stopColor="#c98a4e"/>
                <stop offset="1" stopColor="#7a4a1f"/>
              </>}
              {tierKey==="silver" && <>
                <stop offset="0" stopColor="#e8e8ec"/>
                <stop offset="1" stopColor="#8d929a"/>
              </>}
              {tierKey==="gold" && <>
                <stop offset="0" stopColor="#ffe27a"/>
                <stop offset="1" stopColor="#c88c00"/>
              </>}
            </linearGradient>
          </defs>
          {/* ribbon tails */}
          <path d="M22 50 L 14 78 L 28 70 L 32 62 Z" fill="#e1251b" stroke="#0c0c0c" strokeWidth="2.5" strokeLinejoin="round"/>
          <path d="M58 50 L 66 78 L 52 70 L 48 62 Z" fill="#e1251b" stroke="#0c0c0c" strokeWidth="2.5" strokeLinejoin="round"/>
          {/* outer star burst */}
          <path d="M40 4 L 47 18 L 62 12 L 58 28 L 74 32 L 60 42 L 70 56 L 54 54 L 50 70 L 40 58 L 30 70 L 26 54 L 10 56 L 20 42 L 6 32 L 22 28 L 18 12 L 33 18 Z"
                fill="#0c0c0c"/>
          {/* medal disc */}
          <circle cx="40" cy="36" r="22" fill={"url(#medal-"+tierKey+")"} stroke="#0c0c0c" strokeWidth="3"/>
          <circle cx="40" cy="36" r="16" fill="none" stroke="#0c0c0c" strokeWidth="1.5" opacity=".5"/>
          {/* tier letter */}
          <text x="40" y="44" textAnchor="middle" fontFamily="Bowlby One, sans-serif" fontSize="20" fill="#0c0c0c">
            {tierKey==="bronze" ? "B" : tierKey==="silver" ? "S" : "G"}
          </text>
        </svg>
      </div>

      <div className="tier-info">
        <div className="tier-label">
          IL TUO LIVELLO <span className="tier-name">{tier.label}</span>
        </div>
        <ul className="tier-perks">
          {tier.perks.map((p,i)=>(
            <li key={i}><span className="dot"></span>{p.t}</li>
          ))}
        </ul>
        {/* spend progress bar (no numbers, just stops) */}
        <div className="tier-bar-wrap">
          <div className="tier-bar">
            <div className="tier-bar-fill" style={{width: overallPct+"%"}}></div>
            {/* stops */}
            <div className={"tier-stop tier-stop-b " + (totalSpent >= TIER_THRESHOLDS.bronze ? "reached":"")}>
              <span className="stop-dot">B</span>
            </div>
            <div className={"tier-stop tier-stop-s " + (totalSpent >= TIER_THRESHOLDS.silver ? "reached":"")}
              style={{left: ((TIER_THRESHOLDS.silver/TIER_THRESHOLDS.gold)*100)+"%"}}>
              <span className="stop-dot">S</span>
            </div>
            <div className={"tier-stop tier-stop-g " + (totalSpent >= TIER_THRESHOLDS.gold ? "reached":"")}>
              <span className="stop-dot">G</span>
            </div>
          </div>
          <div className="tier-bar-cap">
            {nextKey
              ? <>Progressi verso il livello <b>{TIERS[nextKey].label}</b></>
              : <>Hai raggiunto il massimo livello</>
            }
          </div>
        </div>
      </div>

      <div className="tier-status">
        {tierPct > 0 ? (
          <>
            <div className="tier-pct">−{Math.round(tierPct*100)}%</div>
            <div className="tier-pct-lab">sconto attivo<br/>sul prossimo ordine</div>
          </>
        ) : tierKey === "bronze" ? (
          <>
            <div className="tier-upsell">PASSA A<br/><b>SILVER</b></div>
            <div className="tier-pct-lab">per sbloccare<br/>−10% e spedizione</div>
          </>
        ) : (
          <>
            <div className="tier-pct" style={{fontSize:18}}>✓</div>
            <div className="tier-pct-lab">benefici attivi<br/>su questo ordine</div>
          </>
        )}

        {sortedIntro.length > 0 && (
          <div className="tier-progress">
            {sortedIntro.map((rule, i) => {
              const prev = i === 0 ? 0 : sortedIntro[i-1].firstOrders;
              const inside = ordersPlaced < rule.firstOrders;
              const used = inside ? Math.max(0, ordersPlaced - prev) : (rule.firstOrders - prev);
              const total = rule.firstOrders - prev;
              return (
                <div className="tier-prog-item" key={i}>
                  <div className="tier-prog-top">
                    <span>−{Math.round(rule.pct*100)}% sui prossimi</span>
                    <b>{Math.max(0, rule.firstOrders - Math.max(prev, ordersPlaced))}/{total}</b>
                  </div>
                  <div className="tier-prog-bar">
                    <div className="tier-prog-fill" style={{width: Math.min(100, (used/total)*100)+"%"}}></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const PROMOS = {
  "MANGA10":   { label: "−10% sull'ordine", kind: "pct", value: 0.10 },
  "SHONEN15":  { label: "−15% shonen", kind: "pct", value: 0.15 },
  "BENVENUTO": { label: "−5€ benvenuto", kind: "flat", value: 5 }
};

function App(){
  const [t, setTweak] = (window.useTweaks ? window.useTweaks(TWEAKS_DEFAULTS) : [TWEAKS_DEFAULTS, ()=>{}]);

  const [items, setItems] = useState([
    {
      id: "p1",
      title: "Promo Magazine n.42",
      meta: "Edizione limitata · 192 pp · Italiano",
      price: 40.00,
      compare: 48.00,
      qty: 1,
      tags: [{l:"NUOVO", c:"red"},{l:"SHONEN", c:""},{l:"-17%", c:"dark"}],
      slotId:"cover-1",
      placeholder:"Copertina manga"
    },
    {
      id: "p2",
      title: "Set Stickers Holographic",
      meta: "12 pezzi · Pack collezione",
      price: 8.50,
      compare: null,
      qty: 1,
      tags: [{l:"GADGET", c:""}],
      slotId:"cover-2",
      placeholder:"Stickers pack"
    }
  ]);

  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [paid, setPaid] = useState(false);

  const totalSpent = Number(t.totalSpent) || 0;
  const tierKey = tierFromSpend(totalSpent);
  const tier = TIERS[tierKey] || TIERS.bronze;
  const ordersPlaced = Number(t.ordersPlaced) || 0;
  const tierPct = tierIntroDiscount(tierKey, ordersPlaced);

  const subtotal = useMemo(()=>items.reduce((s,i)=>s+i.price*i.qty,0),[items]);

  // promo discount
  const promoDiscount = useMemo(()=>{
    if(!appliedPromo) return 0;
    const p = PROMOS[appliedPromo];
    if(!p) return 0;
    return p.kind === "pct" ? subtotal * p.value : Math.min(p.value, subtotal);
  },[subtotal,appliedPromo]);

  // tier discount applied on top of (subtotal - promo)
  const tierDiscount = useMemo(()=>{
    const base = subtotal - promoDiscount;
    return base > 0 ? base * tierPct : 0;
  },[subtotal, promoDiscount, tierPct]);

  const discount = promoDiscount + tierDiscount;
  const afterDisc = Math.max(0, subtotal - discount);

  // shipping based on tier threshold
  const shipThreshold = tier.shippingFree;
  const shipping = afterDisc >= shipThreshold ? 0 : 5.90;
  const remaining = Math.max(0, shipThreshold - afterDisc);
  const total = Math.max(0, afterDisc + shipping);

  function setQty(id, delta){
    setItems(items => items.map(i => i.id===id ? {...i, qty: Math.max(1, i.qty+delta)} : i));
  }
  function remove(id){
    setItems(items => items.filter(i => i.id !== id));
  }
  function applyPromo(){
    const code = promo.trim().toUpperCase();
    if(!code) return;
    if(PROMOS[code]){
      setAppliedPromo(code);
      setPromoError("");
    } else {
      setPromoError("Codice non valido");
    }
  }

  // recommended
  const recs = [
    {id:"r1", title:"Action Figure 18cm", price:34.90, slot:"rec-1", placeholder:"Action figure", ribbon:"TOP"},
    {id:"r2", title:"Poster A2 Edizione", price:12.00, slot:"rec-2", placeholder:"Poster", ribbon:null},
    {id:"r3", title:"Volume one-shot",    price:14.50, slot:"rec-3", placeholder:"Volume", ribbon:"-20%"},
    {id:"r4", title:"Card collezione",    price:6.50,  slot:"rec-4", placeholder:"Trading card", ribbon:null}
  ];

  function addRec(rec){
    setItems(it => {
      if(it.find(x=>x.id===rec.id)) return it.map(x=>x.id===rec.id?{...x,qty:x.qty+1}:x);
      return [...it, {
        id: rec.id, title: rec.title, meta:"Aggiunto al carrello", price: rec.price,
        compare:null, qty:1, tags:[{l:"NUOVO", c:""}], slotId: rec.slot, placeholder: rec.placeholder
      }];
    });
  }

  return (
    <div className="page">
      {/* ========== LEFT ========== */}
      <section>
        {/* ---- TIER CARD ---- */}
        <TierStrip tier={tier} tierKey={tierKey} ordersPlaced={ordersPlaced} tierPct={tierPct} totalSpent={totalSpent} />

        <div className="panel">
          <div className="halftone ht-tl"></div>
          <div className="panel-head">
            <span className="tag">01</span>
            <span className="grow">I TUOI MANGA</span>
            <span className="cnt">{items.length} ART.</span>
          </div>

          {items.length === 0 && (
            <div style={{padding:"40px",textAlign:"center",color:"#6f6a5e"}}>
              <div style={{fontFamily:"'Bowlby One'",fontSize:22,color:"#111",marginBottom:8}}>CARRELLO VUOTO</div>
              Aggiungi qualcosa dai consigliati qui sotto.
            </div>
          )}

          {items.map(item => (
            <div className="product" key={item.id}>
              <div className="cover">
                <image-slot id={item.slotId} placeholder={item.placeholder} shape="rect"></image-slot>
                <div className="label">VOL. {item.id.slice(-1)}</div>
              </div>
              <div className="p-info">
                <h3 className="p-title">{item.title}</h3>
                <p className="p-meta">{item.meta}</p>
                <div className="p-tags">
                  {item.tags.map((tg,i)=>(
                    <span key={i} className={"p-tag " + (tg.c||"")}>{tg.l}</span>
                  ))}
                </div>
              </div>
              <div className="qty" aria-label="Quantità">
                <button onClick={()=>setQty(item.id,-1)}>−</button>
                <div className="v">{item.qty}</div>
                <button onClick={()=>setQty(item.id,+1)}>+</button>
              </div>
              <div className="price">
                €{(item.price*item.qty).toFixed(2)}
                {item.compare && <small>€{(item.compare*item.qty).toFixed(2)}</small>}
              </div>
              <button className="kill" onClick={()=>remove(item.id)} aria-label="Rimuovi">×</button>
            </div>
          ))}

          <div className="halftone ht-br"></div>
        </div>

        {/* recommended */}
        {t.showRecommended && (
          <div className="also">
            <div className="also-head">
              <h3>POTREBBE PIACERTI <span className="swish">↓</span></h3>
              <span style={{fontSize:12,color:"#6f6a5e",fontWeight:600,letterSpacing:".06em"}}>SELEZIONATI DA TE</span>
            </div>
            <div className="also-grid">
              {recs.map(r => (
                <div className="mini" key={r.id}>
                  <div className="m-cover">
                    <image-slot id={r.slot} placeholder={r.placeholder} shape="rect"></image-slot>
                    {r.ribbon && <span className="ribbon">{r.ribbon}</span>}
                  </div>
                  <h4>{r.title}</h4>
                  <div className="m-row">
                    <span className="m-price">€{r.price.toFixed(2)}</span>
                    <button className="add" onClick={()=>addRec(r)} aria-label="Aggiungi">+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* trust */}
        <div className="trust">
          <div>
            <div className="ico">🚚</div>
            <div>{tier.shippingFree === 0 ? "Spedizione sempre gratis" : "Spedizione gratis"}<br/><span style={{color:"#6f6a5e",fontWeight:500}}>{tier.shippingFree === 0 ? "per i Gold" : "sopra €"+tier.shippingFree}</span></div>
          </div>
          <div>
            <div className="ico red">↩</div>
            <div>Reso facile<br/><span style={{color:"#6f6a5e",fontWeight:500}}>entro 14 giorni</span></div>
          </div>
          <div>
            <div className="ico white">🔒</div>
            <div>Pagamento sicuro<br/><span style={{color:"#6f6a5e",fontWeight:500}}>SSL · Stripe</span></div>
          </div>
        </div>
      </section>

      {/* ========== RIGHT ========== */}
      <aside className="side">
        <div className="panel summary">
          <div className={"burst burst-"+tierKey}>
            {tier.shippingFree === 0
              ? <>SPED.<br/>SEMPRE<span className="small">GRATIS</span></>
              : <>SPED.<br/>GRATIS<span className="small">SOPRA €{tier.shippingFree}</span></>
            }
          </div>

          <div className="panel-head">
            <span className="tag">02</span>
            <span className="grow">RIEPILOGO ORDINE</span>
          </div>

          <div className="sum-body">
            {items.map(i => (
              <div className="row muted" key={i.id}>
                <span style={{maxWidth:"70%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{i.title} ×{i.qty}</span>
                <strong style={{color:"#111"}}>€{(i.price*i.qty).toFixed(2)}</strong>
              </div>
            ))}
            <hr/>
            <div className="row"><span>Subtotale</span><strong>€{subtotal.toFixed(2)}</strong></div>
            {promoDiscount > 0 && (
              <div className="row" style={{color:"#e1251b"}}>
                <span>Codice <b>{appliedPromo}</b></span><strong>−€{promoDiscount.toFixed(2)}</strong>
              </div>
            )}
            {tierDiscount > 0 && (
              <div className="row" style={{color:"#e1251b"}}>
                <span>Sconto {tier.label} ({Math.round(tierPct*100)}%)</span><strong>−€{tierDiscount.toFixed(2)}</strong>
              </div>
            )}
            <div className="row">
              <span>Spedizione</span>
              <strong>{shipping === 0 ? "GRATIS" : "€"+shipping.toFixed(2)}</strong>
            </div>

            <div className="ship-bar">
              <div className="top">
                <span className="truck"></span>
                {shipping === 0
                  ? <><b style={{color:"#fff"}}>Spedizione gratuita sbloccata!</b></>
                  : <>Aggiungi <b style={{color:"#fff"}}>€{remaining.toFixed(2)}</b> per la spedizione gratuita</>
                }
              </div>
              <div className="bar">
                <div className="fill" style={{width: Math.min(100, (afterDisc/Math.max(1,shipThreshold))*100)+"%"}}></div>
              </div>
            </div>
          </div>

          <div className="total-row">
            <span className="lab">TOTALE<small>{items.length} articol{items.length===1?"o":"i"}</small></span>
            <span className="val">€{total.toFixed(2)}</span>
          </div>

          {/* promo */}
          <div className="promo">
            <label>HAI UN CODICE SCONTO?</label>
            {!appliedPromo ? (
              <>
                <div className="promo-row">
                  <input
                    placeholder="ES. MANGA10"
                    value={promo}
                    onChange={e=>{setPromo(e.target.value);setPromoError("")}}
                    onKeyDown={e=>e.key==="Enter" && applyPromo()}
                  />
                  <button className="apply" onClick={applyPromo}>APPLICA</button>
                </div>
                <div className="chips">
                  {Object.keys(PROMOS).map(c => (
                    <span key={c} className="chip" onClick={()=>{setPromo(c);}}>
                      {c}
                    </span>
                  ))}
                </div>
                {promoError && <div style={{color:"#e63329",fontSize:12,fontWeight:600,marginTop:8}}>⚠ {promoError}</div>}
              </>
            ) : (
              <div className="applied">
                <span>✓ {appliedPromo}: {PROMOS[appliedPromo].label}</span>
                <span className="x" onClick={()=>{setAppliedPromo(null);setPromo("")}}>×</span>
              </div>
            )}
          </div>

          {/* CTA + mascot */}
          <div className="cta-zone">
            {/* sound effect */}
            {t.showSFX && <div className="sfx" style={{top:-22, right:24}}>DON!</div>}

            <div className="terms">
              <input id="agree" type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} />
              <label htmlFor="agree">
                Ho letto e accetto le <a href="#">condizioni di vendita</a> e la <a href="#">privacy policy</a>.
              </label>
            </div>

            <button
              className="cta"
              disabled={!agreed || items.length===0}
              onClick={()=>setPaid(true)}
            >
              <span className="lock">🔒</span>
              PROCEDI AL PAGAMENTO
              <span style={{marginLeft:"auto",fontSize:14,opacity:.85}}>€{total.toFixed(2)} →</span>
            </button>

            <div className="secure">
              <span>PAGAMENTO SICURO</span>
              <div className="pills">
                <span className="pill">VISA</span>
                <span className="pill">MC</span>
                <span className="pill">PAYPAL</span>
                <span className="pill">STRIPE</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {paid && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"grid",placeItems:"center",zIndex:99}} onClick={()=>setPaid(false)}>
          <div style={{background:"#fbf6ea",border:"3px solid #111",boxShadow:"6px 6px 0 #111",padding:"36px 48px",textAlign:"center",maxWidth:420}}>
            <div style={{fontFamily:"'Bangers'",fontSize:64,color:"#e63329",WebkitTextStroke:"2px #111",lineHeight:1}}>YATTA!</div>
            <div style={{fontFamily:"'Bowlby One'",fontSize:18,margin:"12px 0 6px"}}>ORDINE INVIATO</div>
            <div style={{fontSize:14,color:"#6f6a5e",marginBottom:18}}>Demo prototipo — nessun pagamento effettuato.</div>
            <button onClick={()=>setPaid(false)} style={{background:"#111",color:"#fff",border:"none",padding:"10px 18px",fontFamily:"'Bowlby One'",cursor:"pointer",letterSpacing:".06em"}}>CHIUDI</button>
          </div>
        </div>
      )}

      {/* Tweaks Panel */}
      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="Carrello">
            <window.TweakToggle label="Mostra consigliati"
              value={t.showRecommended}
              onChange={v=>setTweak("showRecommended", v)} />
            <window.TweakToggle label="Effetti sonori manga (DON!)"
              value={t.showSFX}
              onChange={v=>setTweak("showSFX", v)} />
          </window.TweakSection>
          <window.TweakSection title="Livello fedeltà">
            <window.TweakSlider label="Totale speso (€)"
              value={t.totalSpent}
              min={0} max={1500} step={10}
              onChange={v=>setTweak("totalSpent", v)} />
            <window.TweakSlider label="Ordini effettuati"
              value={t.ordersPlaced}
              min={0} max={20} step={1}
              onChange={v=>setTweak("ordersPlaced", v)} />
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
