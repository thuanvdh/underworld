export type ErrorCode =
  | "unauthorized"
  | "bad_request"
  | "not_found"
  | "locked_feature"
  | "floor_locked"
  | "not_enough_energy"
  | "not_enough_gold"
  | "not_enough_stones"
  | "battle_finished"
  | "item_equipped"
  | "item_too_high"
  | "max_enhance"
  | "forge_cap"
  | "not_sweepable"
  | "class_change_locked";

const STATUS: Partial<Record<ErrorCode, number>> = {
  unauthorized: 401,
  not_found: 404,
  bad_request: 400,
};

/** A rule violation the client can show; becomes `{ error: code }` with a 4xx status. */
export class GameError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.status = STATUS[code] ?? 409;
  }
}
