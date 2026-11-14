import { ROOM_H, ROOM_W, WALL } from "./types";

export interface CameraPoint {
  x: number;
  y: number;
}

export interface CameraViewport {
  width: number;
  height: number;
  zoom: number;
}

export interface CameraFollowOptions {
  lookAheadX?: number;
  lookAheadY?: number;
  followSpeed?: number;
}

const finiteOr = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Limits the camera center to the room. If the viewport is larger than the
 * room on an axis, that axis is centered instead of exposing empty space. */
export function clampCamera(point: CameraPoint, viewport: CameraViewport): CameraPoint {
  const width = Math.max(1, finiteOr(viewport.width, 1));
  const height = Math.max(1, finiteOr(viewport.height, 1));
  const zoom = Math.max(0.1, finiteOr(viewport.zoom, 1));
  const halfW = width / (2 * zoom);
  const halfH = height / (2 * zoom);
  const minX = WALL + halfW;
  const maxX = ROOM_W - WALL - halfW;
  const minY = WALL + halfH;
  const maxY = ROOM_H - WALL - halfH;

  return {
    x: minX > maxX ? ROOM_W / 2 : clamp(finiteOr(point.x, ROOM_W / 2), minX, maxX),
    y: minY > maxY ? ROOM_H / 2 : clamp(finiteOr(point.y, ROOM_H / 2), minY, maxY),
  };
}

/** Instant camera placement used when a room/sector teleports the player. */
export function snapCamera(target: CameraPoint, viewport: CameraViewport): CameraPoint {
  return clampCamera(target, viewport);
}

/** Frame-rate independent top-down follow camera with a small aim look-ahead.
 * The exponential response avoids overshoot and remains stable at low FPS. */
export function updateFollowCamera(
  current: CameraPoint,
  target: CameraPoint,
  viewport: CameraViewport,
  dt: number,
  options: CameraFollowOptions = {},
): CameraPoint {
  const safeDt = clamp(finiteOr(dt, 0), 0, 0.1);
  const speed = clamp(finiteOr(options.followSpeed ?? 9, 9), 0, 30);
  const desired = clampCamera({
    x: finiteOr(target.x, ROOM_W / 2) + finiteOr(options.lookAheadX ?? 0, 0),
    y: finiteOr(target.y, ROOM_H / 2) + finiteOr(options.lookAheadY ?? 0, 0),
  }, viewport);
  const currentSafe = clampCamera(current, viewport);
  const alpha = 1 - Math.exp(-speed * safeDt);

  return clampCamera({
    x: currentSafe.x + (desired.x - currentSafe.x) * alpha,
    y: currentSafe.y + (desired.y - currentSafe.y) * alpha,
  }, viewport);
}
