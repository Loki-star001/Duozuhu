export interface ScenePersonMedia {
  readonly id: string;
  readonly idle: string;
  readonly speaking: string;
  readonly idlePoster: string;
  readonly speakingPoster: string;
}

// Existing scenes, including elder 1, keep their original transparent clips.
const defaultMedia: ScenePersonMedia = Object.freeze({
  id: 'original-person',
  idle: '/scene-presets/person-idle.webm',
  speaking: '/scene-presets/person-speaking.webm',
  idlePoster: '/scene-presets/person-idle-poster.png',
  speakingPoster: '/scene-presets/person-speaking-poster.png',
});
const elder2Media: ScenePersonMedia = Object.freeze({
  id: 'elder-2-new-standby-joined',
  idle: '/scene-presets/elder-2/person-current.webm',
  speaking: '/scene-presets/elder-2/person-current.webm',
  idlePoster: '/scene-presets/elder-2/person-current-poster.png',
  speakingPoster: '/scene-presets/elder-2/person-current-poster.png',
});

export function personMediaForMachine(machineId?: string | null): ScenePersonMedia {
  return machineId === 'DEV-02' ? elder2Media : defaultMedia;
}
