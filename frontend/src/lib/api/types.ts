export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; details?: string };
export type Api<T> = ApiOk<T> | ApiErr;

export const isApiOk = <T>(r: Api<T>): r is ApiOk<T> => r.ok === true;
export const isApiErr = <T>(r: Api<T>): r is ApiErr => r.ok === false;

/** Throw on error, return data on ok — handy in server components */
export function unwrap<T>(r: Api<T>): T {
  if (isApiOk(r)) return r.data;
  throw new Error(r.error);
}
