import { ref, onMounted, onBeforeUnmount } from 'vue'
export function useDisplayMode() {
  const tv = new URLSearchParams(location.search).get('screen') === 'tv'
  const previewTablet = location.pathname.replace(/\/$/, '') === '/ux/preview' && new URLSearchParams(location.search).get('device') === 'ipad'
  const agent = navigator.userAgent
  const tablet = previewTablet || /iPad/i.test(agent) || (/Android/i.test(agent) && !/Mobile/i.test(agent)) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const detectPhone = () => {
    if (tv) return false
    if (tablet) return false
    return /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(agent) || window.matchMedia('(max-width:767px)').matches
  }
  const phone = ref(detectPhone())
  const update = () => { phone.value = detectPhone() }
  onMounted(() => window.addEventListener('resize',update))
  onBeforeUnmount(() => window.removeEventListener('resize',update))
  return { phone,tv,tablet }
}
