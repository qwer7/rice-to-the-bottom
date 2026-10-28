import { ref, onMounted, onBeforeUnmount } from 'vue'
export function useDisplayMode() {
  const tv = new URLSearchParams(location.search).get('screen') === 'tv'
  const detectPhone = () => {
    if (tv) return false
    const agent = navigator.userAgent
    const tablet = /iPad/i.test(agent) || (/Android/i.test(agent) && !/Mobile/i.test(agent)) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (tablet) return false
    return /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(agent) || window.matchMedia('(max-width:767px)').matches
  }
  const phone = ref(detectPhone())
  const update = () => { phone.value = detectPhone() }
  onMounted(() => window.addEventListener('resize',update))
  onBeforeUnmount(() => window.removeEventListener('resize',update))
  return { phone,tv }
}
