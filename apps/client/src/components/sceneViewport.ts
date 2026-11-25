export function sceneViewport(width: number, height: number, availableWidth: number, availableHeight: number, padding = 40) {
  const scale = Math.max(.001, Math.min(Math.max(1, availableWidth - padding) / width, Math.max(1, availableHeight - padding) / height));
  return { width, height, scale, frameWidth: width * scale, frameHeight: height * scale };
}
