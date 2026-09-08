import { NextResponse } from "next/server";

const STATUS: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  ALREADY_SUBMITTED: 409,
  NOT_ENOUGH_QUESTIONS: 409,
  NOT_ENOUGH_WORDS: 409,
  NOT_SUBMITTED: 409,
  INVALID: 400,
  WRONG_TYPE: 400,
  RATE_LIMITED: 429,
};

/** Đổi Error("MÃ") của lớp nghiệp vụ thành response JSON. Trả null nếu không phải mã đã biết. */
export function errorToResponse(e: unknown): NextResponse | null {
  if (e instanceof Error && e.message in STATUS) {
    return NextResponse.json({ error: e.message }, { status: STATUS[e.message] });
  }
  return null;
}
