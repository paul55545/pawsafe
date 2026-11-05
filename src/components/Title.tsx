// The PawSafe Plants logo (hand-lettered artwork) over a faded cat-and-leaf drawing.
// The lettering is a transparent mask, so CSS can colour it: dark green in light mode, lime in dark mode.

export default function Title() {
  return (
    <header className="flex w-full flex-col items-center">
      <div className="logo-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/cat-leaf.png" alt="" aria-hidden="true" className="logo-backdrop" />
        <h1 className="logo" aria-label="PawSafe Plants">
          <span className="sr-only">PawSafe Plants</span>
        </h1>
      </div>
      <p className="-mt-1 text-muted">Is this plant safe for my cat?</p>
    </header>
  );
}
