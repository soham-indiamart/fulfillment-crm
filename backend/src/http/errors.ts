/** An error that carries the HTTP status the API answers with. Messages of 4xx errors reach the client. */
export class HttpError extends Error {
  override name = 'HttpError';
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const notFound = (message: string) => new HttpError(404, message);
export const payloadTooLarge = (message: string) => new HttpError(413, message);
