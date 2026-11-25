<template>
  <figure class="floor-plan">
    <svg viewBox="-2 -2 540 563" role="group" aria-label="展厅90度俯视导览地图">
      <defs>
        <pattern id="floor-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0H0V10" fill="none" stroke="#cdd4d6" stroke-width=".5"/>
        </pattern>
        <g id="plan-sofa" stroke="#86a29f" stroke-width="1.3">
          <rect width="50" height="18" rx="4" fill="#d4e4de"/>
          <path d="M4 4H46M25 5V17" fill="none"/>
        </g>
        <g id="plan-display">
          <rect width="22" height="17" rx="2" fill="#fff" stroke="#9cabb5"/>
          <rect x="3" y="3" width="16" height="11" rx="2" fill="#e4dac6"/>
          <ellipse cx="11" cy="8" rx="4" ry="3" fill="#ad987d"/>
        </g>
        <g id="plan-seat"><rect width="12" height="11" rx="3" fill="#bccdd8" stroke="#8ba1af"/><path d="M2 3H10" stroke="white"/></g>
        <g id="plan-plant"><circle r="7" fill="#95b9a4" stroke="#789f8b"/><path d="M-4 3L4 -3M-3 -3L2 3" stroke="#cadbd1" fill="none"/></g>
      </defs>
      <rect width="536" height="559" fill="#f6f4ed" stroke="#778a99" stroke-width="4"/>
      <rect width="536" height="559" fill="url(#floor-grid)"/>
      <path d="M262 559V194M55 399H484M55 194H484" fill="none" stroke="#dce6e1" stroke-width="15" stroke-linejoin="round"/>
      <path d="M262 559V194M55 399H484M55 194H484" fill="none" stroke="#7ba59b" stroke-width="2" stroke-dasharray="6 5"/>
      <g v-for="(room,i) in places" :key="room.title" :transform="'translate('+room.x+' '+room.y+')'">
        <rect :width="room.w" :height="room.h" :class="{ 'room-selected': selected===room.title }"
          :fill="floorColors[Math.floor(i/4)]" stroke="#738695" stroke-width="2.6"/>
        <!-- An opening and a door swing face the nearest transverse aisle. -->
        <g :transform="'translate('+ (room.w-28) +' '+ (room.y>400 ? 0 : room.h) +') scale(1 '+ (room.y>400 ? 1 : -1) +')'">
          <path d="M0 0H19" stroke="#f6f4ed" stroke-width="3.4"/>
          <path d="M0 0V19A19 19 0 0 0 19 0" fill="none" stroke="#91a1aa" stroke-width="1"/>
        </g>
        <g :transform="'translate('+(room.w/2)+' '+(room.h*.29)+')'" aria-hidden="true">
          <template v-if="room.type==='lounge'">
            <use href="#plan-sofa" x="-25" y="-23"/><use href="#plan-sofa" transform="rotate(180) translate(-25 -23)"/>
            <ellipse rx="12" ry="5" fill="#fff" stroke="#a7afa8"/>
          </template>
          <template v-else-if="room.type==='gallery'">
            <use href="#plan-display" x="-27" y="-22"/><use href="#plan-display" x="5" y="-22"/>
            <use href="#plan-display" x="-27" y="5"/><use href="#plan-display" x="5" y="5"/>
          </template>
          <template v-else-if="room.type==='display'">
            <rect x="-34" y="-24" width="68" height="6" rx="2" fill="#778eaa"/>
            <use v-for="x in [-25,-6,13]" :key="x" href="#plan-seat" :x="x" y="-2"/>
            <use v-for="x in [-25,-6,13]" :key="'back'+x" href="#plan-seat" :x="x" y="15"/>
          </template>
          <template v-else>
            <use href="#plan-seat" x="-16" y="-21"/><use href="#plan-seat" x="9" y="-21"/>
            <path d="M-32 -9H32V16H23V1H-32Z" fill="#fcfaf4" stroke="#a59782" stroke-width="1.4"/>
            <rect x="-18" y="-7" width="13" height="5" fill="#879da9"/>
          </template>
        </g>
        <use href="#plan-plant" x="10" :y="room.h-11"/>
      </g>
      <g v-for="(room,i) in places" :key="room.title" :transform="pinTransform(room)" class="pin"
        :role="detailOnly ? undefined : 'button'" :tabindex="detailOnly ? undefined : 0"
        :aria-label="stopNumber(i) + ' ' + room.title"
        :class="{ chosen: selected === room.title, inactive: detailOnly && selected !== room.title, static: detailOnly }"
        @click="selectPlace(room.title, $event)" @keydown.enter.prevent="selectPlace(room.title, $event)"
        @keydown.space.prevent="selectPlace(room.title, $event)">
        <title>{{ room.title }}</title><circle r="23" fill="transparent" />
        <circle class="disc" r="17"/><text y="5.5" text-anchor="middle">{{ stopNumber(i) }}</text>
      </g>
    </svg>
  </figure>
  <div v-show="!detailOnly" class="map-key" aria-label="展厅地点索引">
    <button v-for="(room, index) in places" :key="room.title" type="button"
      :data-location-title="room.title" @click="selectPlace(room.title, $event)">
      <b>{{ stopNumber(index) }}</b><span>{{ room.title }}</span>
    </button>
  </div>
</template>
<script setup lang="ts">
import { stopNumber, type ExhibitionStop } from './exhibitionContent';

const props = defineProps<{ selected: string; places: readonly ExhibitionStop[]; detailOnly?: boolean }>();
const emit = defineEmits<{ select: [name: string, event: Event] }>();
function selectPlace(name: string, event: Event) {
  if (!props.detailOnly) emit('select', name, event);
}

const floorColors = ['#eeeef5', '#e2ebf7', '#e4efee'];

function pinTransform(room: ExhibitionStop) {
  const pinX = room.x + room.w / 2;
  const pinY = room.y + room.h * .72;
  return 'translate(' + pinX + ' ' + pinY + ')';
}
</script>
<style scoped>
.floor-plan {
  position: relative;
  margin: 0;
  overflow: hidden;
  border-radius: var(--exhibit-inner-radius);
  background: radial-gradient(ellipse at 45% 42%, #f8fafc, var(--exhibit-accent-tint));
}
.floor-plan svg { display: block; width: 100%; }
.room-selected { fill: #d9e9ff; stroke: var(--exhibit-accent); stroke-width: 2; }
.pin { color: var(--exhibit-muted); cursor: pointer; }
.pin.static { cursor: default; }
.pin.inactive { opacity: .45; }
.pin.chosen { color: var(--exhibit-accent); }
.disc { fill: var(--exhibit-muted); stroke: white; stroke-width: 2; }
.pin.chosen .disc, .pin:focus-visible .disc { fill: var(--exhibit-accent); stroke-width: 4; }
.pin text { fill: white; font: 600 19px system-ui; pointer-events: none; }
.map-key {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0 4px;
  margin-top: 16px;
  padding: 0 18px;
}
.map-key button {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  padding: 5px 7px;
  border-radius: 8px;
  text-align: left;
  color: var(--exhibit-ink);
  font-size: var(--exhibit-body);
}
.map-key b { color: inherit; font-weight: 500; font-variant-numeric: tabular-nums; }
.map-key button:active { color: var(--exhibit-accent); background: var(--exhibit-accent-tint); }
</style>
