/**
 * Grain + vignette preference. Stored in a cookie (not localStorage) so the
 * server renders the right `<html>` class and there's no flash of grain for
 * people who turned it off.
 */
export function useAtmosphere() {
  const enabled = useCookie<boolean>('fl-atmosphere', {
    default: () => true,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })

  function toggle() {
    enabled.value = !enabled.value
  }

  return { enabled, toggle }
}
