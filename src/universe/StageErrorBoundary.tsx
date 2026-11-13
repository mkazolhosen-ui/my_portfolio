import { Component, type ErrorInfo, type ReactNode } from 'react'

interface StageErrorBoundaryProps {
  /** What to show in the frame if the 3D stage cannot start. */
  fallback: ReactNode
  children: ReactNode
}

interface StageErrorBoundaryState {
  failed: boolean
}

/**
 * If the 3D chunk fails to download or WebGL fails to start, the frame shows a short message
 * instead of crashing the page. The project list and detail panel keep working.
 */
export default class StageErrorBoundary extends Component<
  StageErrorBoundaryProps,
  StageErrorBoundaryState
> {
  state: StageErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): StageErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.warn('[universe] The 3D stage failed to start:', error, info.componentStack)
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
