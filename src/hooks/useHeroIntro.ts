import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import usePrefersReducedMotion from './usePrefersReducedMotion'

/** Plays the hero entrance animation. Skipped entirely for reduced motion. */
export default function useHeroIntro(scope: RefObject<HTMLElement | null>) {
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    if (reduced) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.from('.hero__content .eyebrow', { autoAlpha: 0, y: 16, duration: 0.8 }, 0.2)
        .from(
          '.hero__word',
          {
            autoAlpha: 0,
            yPercent: 55,
            filter: 'blur(14px)',
            duration: 1.1,
            stagger: 0.14,
            clearProps: 'filter,transform,opacity,visibility',
          },
          0.35,
        )
        .from('.hero__tagline', { autoAlpha: 0, y: 20, duration: 0.9 }, 0.95)
        .from('.hero__intro', { autoAlpha: 0, y: 20, duration: 0.9 }, 1.1)
        .from('.hero__actions', { autoAlpha: 0, y: 20, duration: 0.9 }, 1.25)
        .from('.hero__scroll', { autoAlpha: 0, duration: 1 }, 1.6)
    }, scope)

    return () => ctx.revert()
  }, [reduced, scope])
}