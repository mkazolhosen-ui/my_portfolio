import { useLayoutEffect, type RefObject } from 'react'
import gsap from 'gsap'
import usePrefersReducedMotion from './usePrefersReducedMotion'
import { introControl, useIntroStatus } from '../scene/introState'

/** Removes the CSS rule that hides the hero while the 3D intro plays. */
function revealHero() {
  document.documentElement.removeAttribute('data-intro')
}

/**
 * Plays the hero entrance animation, after the 3D name intro has finished.
 * Skipped entirely for reduced motion.
 */
export default function useHeroIntro(scope: RefObject<HTMLElement | null>) {
  const reduced = usePrefersReducedMotion()
  const intro = useIntroStatus()

  useLayoutEffect(() => {
    // Wait: the 3D intro is still playing.
    if (intro === 'playing') return

    if (reduced) {
      revealHero()
      return
    }

    // After the 3D name intro, the 3D name has already docked exactly on the title,
    // so the real title just fades in on the spot instead of sliding up from below.
    const docked = introControl.started

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      tl.from('.hero__content .eyebrow', { autoAlpha: 0, y: 16, duration: 0.8 }, 0.2)
        .from(
          '.hero__word',
          docked
            ? {
                autoAlpha: 0,
                duration: 0.8,
                stagger: 0.08,
                ease: 'power2.out',
                clearProps: 'opacity,visibility',
              }
            : {
                autoAlpha: 0,
                yPercent: 55,
                filter: 'blur(14px)',
                duration: 1.1,
                stagger: 0.14,
                clearProps: 'filter,transform,opacity,visibility',
              },
          docked ? 0.05 : 0.35,
        )
        .from('.hero__tagline', { autoAlpha: 0, y: 20, duration: 0.9 }, 0.95)
        .from('.hero__intro', { autoAlpha: 0, y: 20, duration: 0.9 }, 1.1)
        .from('.hero__actions', { autoAlpha: 0, y: 20, duration: 0.9 }, 1.25)
        .from('.hero__scroll', { autoAlpha: 0, duration: 1 }, 1.6)
    }, scope)

    // Reveal only after GSAP has set every starting state, so nothing flashes.
    revealHero()

    return () => ctx.revert()
  }, [reduced, scope, intro])
}