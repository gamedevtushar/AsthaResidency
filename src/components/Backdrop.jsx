/** Calm background: the theme colour with two very soft tints behind the glass surfaces. */
export default function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      <div className="absolute -left-40 -top-48 size-[36rem] rounded-full bg-accent/[0.08] blur-[120px]" />
      <div className="absolute -bottom-48 -right-32 size-[32rem] rounded-full bg-info/[0.06] blur-[120px]" />
    </div>
  )
}
