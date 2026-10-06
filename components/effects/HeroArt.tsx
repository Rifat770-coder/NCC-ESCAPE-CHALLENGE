/** Original decorative vector artwork; no game state or interactions. */
export function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="hex-bg" />
      <svg viewBox="0 0 540 600" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="armor" x1="110" y1="130" x2="410" y2="530" gradientUnits="userSpaceOnUse">
            <stop stopColor="#62665B" /><stop offset=".35" stopColor="#272B29" /><stop offset="1" stopColor="#080A09" />
          </linearGradient>
          <linearGradient id="edge" x1="180" y1="80" x2="340" y2="400" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B1B5A0" /><stop offset="1" stopColor="#34392F" />
          </linearGradient>
          <linearGradient id="visor" x1="195" y1="180" x2="338" y2="195" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EFFF00" /><stop offset=".5" stopColor="#FAFFAF" /><stop offset="1" stopColor="#EFFF00" />
          </linearGradient>
          <pattern id="tech-lines" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 6H12" stroke="#FFFFFF" strokeOpacity=".04" />
          </pattern>
        </defs>
        <path d="M40 570 52 375 130 293 183 275H357L410 295 488 380 508 570Z" fill="#101411" stroke="#636A50" />
        <path d="m80 335 71-60 54 26-30 120-102-29Z" fill="url(#armor)" stroke="#737968" strokeWidth="2" />
        <path d="m460 335-71-60-54 26 30 120 102-29Z" fill="url(#armor)" stroke="#737968" strokeWidth="2" />
        <path d="m91 325-26-49 59 20 14-43 29 49M449 325l26-49-59 20-14-43-29 49" fill="#151A14" stroke="#969D70" strokeWidth="2" />
        <path d="m176 308 94-30 94 30 31 171-125 78-125-78Z" fill="url(#armor)" stroke="#686F5A" strokeWidth="2" />
        <path d="m176 310 69 42-14 47-67-32ZM364 310l-69 42 14 47 67-32Z" fill="#545A48" stroke="#A4AA8F" />
        <path d="m180 320 57 33-5 14-57-30ZM360 320l-57 33 5 14 57-30Z" fill="#EFFF00" />
        <path d="m223 370 47-27 47 27v54l-47 27-47-27Z" fill="#0A0E08" stroke="#EFFF00" strokeWidth="3" />
        <path d="M252 386h36v22h-36Z" stroke="#EFFF00" strokeWidth="2" />
        <path d="M244 391h8m-8 12h8m36-12h8m-8 12h8m-37-24v7m12-7v7m-12 22v7m12-7v7" stroke="#EFFF00" strokeWidth="2" />
        <path d="m175 423 54 30-12 43-57-37Zm190 0-54 30 12 43 57-37Z" fill="#30372C" stroke="#696F5E" />
        <path d="m218 466 52 30 52-30-8 52-44 25-44-25Z" fill="#777E61" stroke="#B1B799" />
        <path d="m144 376-68 20-32 132 59 31 58-111Zm252 0 68 20 32 132-59 31-58-111Z" fill="url(#armor)" stroke="#767D68" strokeWidth="2" />
        <path d="m63 446 54 20-9 28-52-20Zm414 0-54 20 9 28 52-20Z" fill="#4C5440" stroke="#ABB48A" />
        <path d="m80 402 42 14-4 8-42-14Zm380 0-42 14 4 8 42-14Z" fill="#EFFF00" />
        <path d="M219 267h102v36l-51 22-51-22Z" fill="#11160E" stroke="#737B60" strokeWidth="2" />
        <path d="m171 134 37-58h124l37 58-16 115-83 50-83-50Z" fill="url(#armor)" stroke="url(#edge)" strokeWidth="3" />
        <path d="m202 90 25-35h86l25 35-24 36h-88Z" fill="#454C3C" stroke="#A9AF98" strokeWidth="2" />
        <path d="M249 64h42v45h-42Z" fill="#969C82" /><path d="M259 66h22v42h-22Z" fill="#252C21" />
        <path d="m170 134-21-45 34 19 14-42 11 43M370 134l21-45-34 19-14-42-11 43" fill="#171D13" stroke="#818A65" strokeWidth="2" />
        <path d="m187 142 83 25 83-25-8 77-75 28-75-28Z" fill="#080C07" stroke="#707A55" strokeWidth="2" />
        <path d="m196 169 60 18-10 17-47-14Zm148 0-60 18 10 17 47-14Z" fill="url(#visor)" />
        <path d="m260 167 10-19 10 19 11 67-21 21-21-21Z" fill="#4E5740" stroke="#A9B48D" />
        <path d="m198 224 41 13 31 31 31-31 41-13-14 32-58 35-58-35Z" fill="#323B29" stroke="#899474" />
        <path d="m247 255 23 15 23-15M251 265l19 12 19-12" stroke="#EFFF00" strokeOpacity=".5" />
        <path d="M158 151h22v66h-22ZM360 151h22v66h-22Z" fill="#252D20" stroke="#A0AA82" />
        <path d="m123 484 29-47 313 87-9 54-115-22-18 27-47-11 3-31Z" fill="#161B14" stroke="#818A69" strokeWidth="2" />
        <path d="m171 452 181 51-9 26-181-51Z" fill="#4A5240" stroke="#A3AD8B" />
        <path d="m190 463 128 36" stroke="#EFFF00" strokeWidth="4" />
        <path d="m368 509 92 27-4 21-92-27Z" fill="#090D07" stroke="#586348" />
        <path d="m72 511 62-15 33 28-8 44-44 12-46-29ZM412 550l33-28 39 16-5 39-49 9Z" fill="url(#armor)" stroke="#8D967B" strokeWidth="2" />
        <path d="M40 570h468v30H40Z" fill="#050505" />
        <path d="M40 570h468" stroke="#EFFF00" strokeOpacity=".4" />
        <path d="M171 134h198v157H171Z" fill="url(#tech-lines)" />
        <g stroke="#EFFF00" strokeOpacity=".6">
          <path d="M30 180v-45h45M510 180v-45h-45M30 480v45h45M510 480v45h-45" />
          <path d="M30 330h25M485 330h25" />
        </g>
      </svg>
      <span className="hero-art-label">NCC CORE / ESCAPE PROTOCOL</span>
    </div>
  );
}
