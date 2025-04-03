import { DeviceAuthorizationResponse as DeviceAuthorizationResponseOIDC } from "openid-client";

export interface DeviceAuthorizationResponse {
  /**
   * The device verification code
   */
  readonly deviceCode: string;
  /**
   * The end-user verification code
   */
  readonly userCode: string;
  /**
   * The end-user verification URI on the authorization server. The URI should be short and easy to
   * remember as end users will be asked to manually type it into their user agent.
   */
  readonly verificationUri: string;

  /**
   * The lifetime in seconds of the "device_code" and "user_code".
   */
  readonly expiresIn: number;

  /**
   * A verification URI that includes the "user_code" (or other information with the same function
   * as the "user_code"), which is designed for non-textual transmission
   */
  readonly verificationUriComplete?: string;
  /**
   * The minimum amount of time in seconds that the client
   * should wait between polling requests to the token endpoint.
   */
  readonly interval?: number;

  /**
   * The time at which the request was made
   * (in secs since the Unix epoch)
   */
  readonly requestedAt: number;

  readonly [parameter: string]: any | undefined;
}

// Function to map from DeviceAuthorizationResponseOIDC to DeviceAuthorizationResponse
export function parseDeviceAuthResponse(
  oidcResponse: DeviceAuthorizationResponseOIDC,
  requestedAt: number
): DeviceAuthorizationResponse {
  const {
    device_code,
    user_code,
    verification_uri,
    expires_in,
    verification_uri_complete,
    interval,
    ...rest
  } = oidcResponse;
  return {
    deviceCode: device_code,
    userCode: user_code,
    verificationUri: verification_uri,
    expiresIn: expires_in,
    verificationUriComplete: verification_uri_complete,
    interval: interval,
    requestedAt,
    ...rest,
  };
}
