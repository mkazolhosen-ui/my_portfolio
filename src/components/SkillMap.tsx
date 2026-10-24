import { useMemo } from 'react'
import type { SkillGroup } from '../config/site'

const SIZE = 600
const C = SIZE / 2
const GROUP_RADIUS = 150
const LEAF_RADIUS = 238
/** Angle in degrees between neighbouring item dots. */
const LEAF_SPREAD = 17

const toRad = (deg: number) => (deg * Math.PI) / 180
const polar = (r: number, deg: number) => ({
  x: C + r * Math.cos(toRad(deg)),
  y: C + r * Math.sin(toRad(deg)),
})

interface SkillMapProps {
  groups: SkillGroup[]
  active: number | null
  onActive: (index: number | null) => void
}

/**
 * Decorative constellation of skill groups. It shows structure only, not proficiency.
 * The full content is in the skill cards next to it, so this is hidden from assistive tech.
 */
export default function SkillMap({ groups, active, onActive }: SkillMapProps) {
  const layout = useMemo(
    () =>
      groups.map((group, i) => {
        const angle = -90 + (360 / groups.length) * i
        return {
          angle,
          node: polar(GROUP_RADIUS, angle),
          leaves: group.items.map((_, j) =>
            polar(LEAF_RADIUS, angle + (j - (group.items.length - 1) / 2) * LEAF_SPREAD),
          ),
        }
      }),
    [groups],
  )

  return (
    <svg
      className="skillmap"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
      focusable="false"
    >
      <circle className="skillmap__orbit" cx={C} cy={C} r={GROUP_RADIUS} />
      <circle
        className="skillmap__orbit skillmap__orbit--outer"
        cx={C}
        cy={C}
        r={LEAF_RADIUS}
      />

      {groups.map((group, i) => {
        const { node, leaves, angle } = layout[i]
        const state =
          active === i ? ' is-active' : active !== null ? ' is-dim' : ''
        // The top group's label goes above its node, the others below.
        const labelAbove = Math.sin(toRad(angle)) < -0.5

        return (
          <g
            key={group.title}
            className={`skillmap__group${state}`}
            onPointerEnter={() => onActive(i)}
            onPointerLeave={() => onActive(null)}
          >
            <line className="skillmap__spoke" x1={C} y1={C} x2={node.x} y2={node.y} />

            {leaves.map((leaf, j) => (
              <g key={group.items[j]}>
                <line
                  className="skillmap__twig"
                  x1={node.x}
                  y1={node.y}
                  x2={leaf.x}
                  y2={leaf.y}
                />
                <circle className="skillmap__leaf" cx={leaf.x} cy={leaf.y} r={5} />
              </g>
            ))}

            <circle className="skillmap__node-halo" cx={node.x} cy={node.y} r={22} />
            <circle className="skillmap__node" cx={node.x} cy={node.y} r={11} />
            <text
              className="skillmap__label"
              x={node.x}
              y={labelAbove ? node.y - 30 : node.y + 42}
              textAnchor="middle"
            >
              {group.title}
            </text>
          </g>
        )
      })}

      <rect
        className="skillmap__core"
        x={C - 14}
        y={C - 14}
        width={28}
        height={28}
        transform={`rotate(45 ${C} ${C})`}
      />
    </svg>
  )
}