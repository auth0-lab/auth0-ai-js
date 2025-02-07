export class AccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class UserDoesNotHavePushNotificationsError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class AuthorizationRequestExpiredError extends Error {
  constructor(message: string) {
    super(message);
  }
}
