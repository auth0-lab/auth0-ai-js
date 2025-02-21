export type AUTH0_AI_ERROR = {
  // {"code":"THIRD_PARTY_ACCESS_AUTH_REQUIRED","toolCallId":"call_ZWM74eCSkB1Sx4et8qfkeOEl","name":"ThirdPartyAccessAuthRequiredError","connection":"google-market0-6","scopes":["https://www.googleapis.com/auth/calendar"]}
  code: string;
  toolCallId: string;
  name: string;
  connection: string;
  scopes: Array<string>;
  addToolResult: (result: any) => void;
}
