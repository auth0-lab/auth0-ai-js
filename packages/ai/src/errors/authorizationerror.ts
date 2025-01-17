// https://datatracker.ietf.org/doc/html/rfc6750
// https://datatracker.ietf.org/doc/html/rfc9470

export interface AuthorizationErrorOptions {
  acrValues?: string[] | string;
  maxAge?: number | string;
  scope?: string[] | string;
  realm?: string;
  audience?: string;
}

export class AuthorizationError extends Error {
  code: string;
  acrValues: string[];
  maxAge: number;
  scope: string[];
  realm: string;
  audience: string;

  constructor(
    message: string,
    code: string,
    params: AuthorizationErrorOptions
  ) {
    super(message);

    this.code = code;
    if (typeof params.scope === "string") {
      this.scope = params.scope.split(" ");
    } else {
      this.scope = params.scope;
    }
    if (typeof params.acrValues === "string") {
      this.acrValues = params.acrValues.split(" ");
    } else {
      this.acrValues = params.acrValues;
    }
    if (typeof params.maxAge === "string") {
      this.maxAge = parseInt(params.maxAge);
    } else {
      this.maxAge = params.maxAge;
    }
    this.realm = params.realm;

    if (params.audience) {
      this.audience = params.audience;
    }
  }
}
