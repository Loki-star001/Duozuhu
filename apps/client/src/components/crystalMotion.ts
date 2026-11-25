export type CrystalState = 'idle' | 'listening' | 'thinking' | 'speaking';

export function createCrystalMotion(duration = 45) {
  return { angle: 24, streamAngle: 24, speed: 360 / Math.max(.1, duration), streamSpeed: 18, strength: 0, softness: 4, phase: 0 };
}

export function advanceCrystalMotion(current: ReturnType<typeof createCrystalMotion>, state: CrystalState, duration: number, elapsed: number) {
  const dt = Math.max(0, Math.min(elapsed, .1));
  const ease = 1 - Math.exp(-dt * 6);
  const target = {
    idle: { speed: 18, strength: 0, softness: 4 },
    listening: { speed: 118, strength: .62, softness: 3.5 },
    thinking: { speed: 148, strength: .68, softness: 4.2 },
    speaking: { speed: 72, strength: .78, softness: 5.5 },
  }[state];
  const speed = current.speed + (360 / Math.max(.1, duration) - current.speed) * ease;
  const streamSpeed = current.streamSpeed + (target.speed - current.streamSpeed) * ease;
  return {
    angle: (current.angle + speed * dt) % 360,
    streamAngle: (current.streamAngle + streamSpeed * dt) % 360,
    speed,
    streamSpeed,
    strength: current.strength + (target.strength - current.strength) * ease,
    softness: current.softness + (target.softness - current.softness) * ease,
    phase: (current.phase + dt * (state === 'listening' ? 3.6 : 2)) % (Math.PI * 2),
  };
}
