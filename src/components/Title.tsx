// The PawSafe Plants title: a paw print filled with a photo of a real plant (my golden barrel cactus),
// the name written over it like a sticker, and roots growing down from "Plants".
import { Chewy } from "next/font/google";

const chewy = Chewy({ weight: "400", subsets: ["latin"] });

export default function Title() {
  return (
    <header className="flex flex-col items-center">
      <div className="text-3xl" aria-hidden="true">
        🐱🌿
      </div>

      <div className="relative grid w-[15rem] place-items-center">
        {/* Paw print, used as a window onto the plant photo */}
        <svg viewBox="0 0 200 190" className="col-start-1 row-start-1 w-full" aria-hidden="true">
          <defs>
            <clipPath id="paw">
              <ellipse cx="38" cy="72" rx="20" ry="26" transform="rotate(-25 38 72)" />
              <ellipse cx="77" cy="34" rx="21" ry="28" transform="rotate(-8 77 34)" />
              <ellipse cx="123" cy="34" rx="21" ry="28" transform="rotate(8 123 34)" />
              <ellipse cx="162" cy="72" rx="20" ry="26" transform="rotate(25 162 72)" />
              <path d="M100 82 C138 82 168 118 163 150 C159 176 132 180 100 169 C68 180 41 176 37 150 C32 118 62 82 100 82 Z" />
            </clipPath>
          </defs>
          <image
            href="/paw-plant.jpg"
            width="200"
            height="190"
            preserveAspectRatio="xMidYMin slice"
            clipPath="url(#paw)"
          />
        </svg>

        <h1
          className={`${chewy.className} title-sticker col-start-1 row-start-1 self-end pb-3 text-center leading-[0.9]`}
        >
          <span className="block text-[3.4rem]">PawSafe</span>
          <span className="block text-[2.4rem]">Plants</span>
        </h1>
      </div>

      {/* Roots growing down from the name */}
      <svg viewBox="0 0 220 56" className="title-roots -mt-2 w-[13.75rem]" aria-hidden="true">
        <path pathLength="1" d="M110 0 C108 14 112 22 104 34 C98 43 100 50 94 56" />
        <path pathLength="1" d="M110 2 C114 16 126 20 132 32 C137 41 146 44 150 54" />
        <path pathLength="1" d="M106 10 C92 18 80 16 70 26 C62 34 52 34 44 42" />
        <path pathLength="1" d="M114 8 C128 12 148 8 162 16 C172 22 180 22 190 28" />
        <path pathLength="1" d="M104 34 C96 38 88 38 82 46" />
        <path pathLength="1" d="M132 32 C140 34 146 32 154 36" />
        <path pathLength="1" d="M70 26 C66 34 60 40 60 48" />
      </svg>

      <p className="mt-1 text-muted">Is this plant safe for my cat?</p>
    </header>
  );
}
