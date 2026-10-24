import { useCallback, useEffect, useState } from 'react'
import { errorText } from '../apiHelpers'
import { getSiteRow, updateSiteRow, type SitePatch, type SiteRow } from './siteApi'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; row: SiteRow }

/** Loads the site_content row and provides a save function that returns an error message or null. */
export default function useSiteRow() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [key, setKey] = useState(0)

  useEffect(() => {
    let active = true
    getSiteRow()
      .then((row) => {
        if (active) setState({ status: 'ready', row })
      })
      .catch((e: unknown) => {
        if (active) setState({ status: 'error', message: errorText(e) })
      })
    return () => {
      active = false
    }
  }, [key])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setKey((k) => k + 1)
  }, [])

  const save = useCallback(async (patch: SitePatch): Promise<string | null> => {
    try {
      const row = await updateSiteRow(patch)
      setState({ status: 'ready', row })
      return null
    } catch (e) {
      return errorText(e)
    }
  }, [])

  return { state, reload, save }
}