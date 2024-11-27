import { AuthorizationOptions } from './errors/authorizationerror';

export interface Token {
  type: string;
  value: string;
}

export interface TokenResult {
  accessToken: Token
}

export interface PendingResult {
  transactionId: string
}



export interface Authorizer {
  authorize(params: AuthorizationOptions): Promise<TokenResult | PendingResult>;
}
