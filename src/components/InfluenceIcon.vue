<script setup lang="ts">
import type { InfluenceType } from '../../supabase/functions/_shared/game'
import { influenceIcons } from '@/game/influenceIcons'
defineProps<{ name: InfluenceType }>()
</script>
<template>
  <img class="influence-icon" :src="influenceIcons[name]" alt="" aria-hidden="true" />
</template>
