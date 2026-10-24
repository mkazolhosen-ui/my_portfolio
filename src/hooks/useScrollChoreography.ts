import { useLayoutEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SECTION_POSES, poseToState, scrollState } from '../scene/scrollState'
import usePrefersReducedMotion from './usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

/** Groups of elements that fade up (staggered) as they enter the viewport. */
const REVEAL_GROUPS = [
  '.section__header',
  '.about__text p',
  '.chip',
  '.project',
  '.skills__map',
  '.skill',
  '.contact__message',
  '.contact__cta',
  '.contact__links li',
  '.contact__empty',
]

export default function useScrollChoreography() {
  const reduced = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const root = document.documentElement
    const start = SECTION_POSES[0].pose

    const ctx = gsap.context(() => {
      // Always start from the hero pose.
      Object.assign(scrollState, poseToState(start))

      if (reduced) {
        // No choreography: a still, dimmed core and fully visible content.
        gsap.set(root, { '--scene-dim': 0.3 })
        return
      }

      gsap.set(root, { '--scene-dim': start.dim })

      /* ---- 1. Scroll-linked core pose, one scrubbed segment per section ---- */
      for (let i = 1; i < SECTION_POSES.length; i++) {
        const from = SECTION_POSES[i - 1].pose
        const to = SECTION_POSES[i].pose
        const trigger = document.getElementById(SECTION_POSES[i].id)
        if (!trigger) continue

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger,
            start: 'top bottom',
            end: 'top 30%',
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        })

        tl.fromTo(
          scrollState,
          poseToState(from),
          { ...poseToState(to), immediateRender: false },
          0,
        )
        tl.fromTo(
          root,
          { '--scene-dim': from.dim },
          { '--scene-dim': to.dim, immediateRender: false },
          0,
        )
      }

      /* ---- 2. Staggered content reveals ---- */
      REVEAL_GROUPS.forEach((selector) => {
        const els = gsap.utils.toArray<HTMLElement>(selector)
        if (els.length === 0) return

        gsap.set(els, { autoAlpha: 0, y: 36 })

        ScrollTrigger.batch(els, {
          start: 'top 88%',
          once: true,
          onEnter: (batch) => {
            const items = batch as HTMLElement[]
            // Stop CSS hover transitions from fighting the GSAP transform.
            items.forEach((el) => {
              el.style.transition = 'none'
            })
            gsap.to(items, {
              autoAlpha: 1,
              y: 0,
              duration: 0.9,
              ease: 'power3.out',
              stagger: 0.12,
              overwrite: true,
              clearProps: 'opacity,visibility,transform',
              onComplete: () => {
                items.forEach((el) => {
                  el.style.transition = ''
                })
              },
            })
          },
        })
      })

      // Web fonts change layout height; recalculate trigger positions once they load.
      if (document.fonts?.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh())
      }
    })

    return () => ctx.revert()
  }, [reduced])
}