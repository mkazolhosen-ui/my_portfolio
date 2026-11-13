const params = new URLSearchParams(window.location.search)

/** Add ?perf=1 to the address to show a small frame-rate readout while you measure performance. */
export const PERF_ENABLED = params.get('perf') === '1'

/** Add ?stage=off to skip the 3D stage, so you can compare the page with and without it. */
export const STAGE_OFF = params.get('stage') === 'off'

/** Add ?bench=1 to get a "Run benchmark" button that measures what the 3D stage costs. */
export const BENCH_ENABLED = params.get('bench') === '1'

/** Add ?lowpower=1 to force the stage's calm, low-power look, to see how it behaves on weak devices. */
export const LOW_POWER = params.get('lowpower') === '1'