<script setup lang="ts">
import { ref, watch } from 'vue'
import QRCode from 'qrcode'
import { roomJoinUrl } from '@/lib/joinLink'
const props = defineProps<{ code: string; tv?: boolean }>()
const image = ref('')
watch(() => props.code, async code => {
  image.value = ''
  if (!code) return
  const generated = await QRCode.toDataURL(roomJoinUrl(code), { width: props.tv ? 768 : 384, margin: 4, errorCorrectionLevel: 'M', color: { dark: props.tv ? '#273449' : '#101318', light: '#ffffff' } }).catch(() => '')
  if (props.code === code) image.value = generated
}, { immediate:true })
</script>
<template>
  <a class="room-qr" :href="roomJoinUrl(code)" :aria-label="`Войти в комнату ${code} с телефона`"><img v-if="image" :src="image" :alt="`QR-код входа в комнату ${code}`" width="192" height="192"><span v-if="!tv">Наведите камеру<br>и войдите в игру</span></a>
</template>
