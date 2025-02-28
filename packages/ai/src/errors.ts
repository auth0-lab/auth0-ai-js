export class AccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = AccessDeniedError.name;
  }
}

export class UserDoesNotHavePushNotificationsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = UserDoesNotHavePushNotificationsError.name;
  }
}

export class AuthorizationRequestExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = AuthorizationRequestExpiredError.name;
  }
}

export class AuthorizationPending extends Error {
  constructor(message: string) {
    super(message);
    this.name = AuthorizationPending.name;
  }
}
