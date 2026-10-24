import type { ListItem } from './useOrderedList'

interface OrderedItemsProps<T extends ListItem> {
  items: T[]
  titleOf: (item: T) => string
  metaOf?: (item: T) => string
  /** Row actions are disabled while a reorder is saving. */
  reordering: boolean
  busyId: string | null
  onMove: (id: string, dir: -1 | 1) => void
  onEdit: (item: T) => void
  onToggle: (item: T) => void
  onDelete: (item: T) => void
}

export default function OrderedItems<T extends ListItem>({
  items,
  titleOf,
  metaOf,
  reordering,
  busyId,
  onMove,
  onEdit,
  onToggle,
  onDelete,
}: OrderedItemsProps<T>) {
  return (
    <ul className="items" role="list" aria-busy={reordering}>
      {items.map((item, i) => {
        const title = titleOf(item)
        const meta = metaOf?.(item)
        const rowBusy = busyId === item.id

        return (
          <li key={item.id} className="item">
            <div className="item__main">
              <div className="item__title-row">
                <span className="item__index" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="item__title">{title}</h2>
                <span className={`badge ${item.published ? 'badge--live' : 'badge--draft'}`}>
                  {item.published ? 'Published' : 'Draft'}
                </span>
              </div>
              {meta && <p className="item__meta">{meta}</p>}
            </div>

            <div className="item__actions">
              <button
                type="button"
                id={`up-${item.id}`}
                className="btn btn--ghost btn--sm"
                aria-label={`Move ${title} up`}
                disabled={i === 0}
                onClick={() => onMove(item.id, -1)}
              >
                ↑ Up
              </button>
              <button
                type="button"
                id={`down-${item.id}`}
                className="btn btn--ghost btn--sm"
                aria-label={`Move ${title} down`}
                disabled={i === items.length - 1}
                onClick={() => onMove(item.id, 1)}
              >
                ↓ Down
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-label={`Edit ${title}`}
                onClick={() => onEdit(item)}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-label={`${item.published ? 'Unpublish' : 'Publish'} ${title}`}
                disabled={rowBusy}
                onClick={() => onToggle(item)}
              >
                {rowBusy ? 'Working…' : item.published ? 'Unpublish' : 'Publish'}
              </button>
              <button
                type="button"
                className="btn btn--danger-ghost btn--sm"
                aria-label={`Delete ${title}`}
                onClick={() => onDelete(item)}
              >
                Delete
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}