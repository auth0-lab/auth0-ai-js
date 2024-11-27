import { Authorizer, Credentials } from '../authorizer'
import { AuthorizationError, AuthorizationOptions } from '../errors/authorizationerror'

export interface CIBAAuthorizerOptions {
  authorizationURL: string;
  tokenURL: string;
  clientId?: string;
  clientSecret?: string;
}


/**
 * Requests authorization by prompting the user via an out-of-band channel from
 * the backend.
 */
export class PollingCIBAAuthorizer implements Authorizer {
  authorizationURL
  tokenURL
  clientId
  clientSecret
  
  constructor(options: CIBAAuthorizerOptions) {
    this.authorizationURL = options.authorizationURL;
    this.tokenURL = options.tokenURL;
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
  }
  
  async authorize(params: AuthorizationOptions): Promise<Credentials> {
    var headers = {};
    var body: {
      login_hint?: string;
      acr_values?: string;
      scope?: string
      binding_message?: string
    } = {}
    
    if (this.clientId && this.clientSecret) {
      headers['Authorization'] = 'Basic ' + Buffer.from([ this.clientId, this.clientSecret ].join(':')).toString('base64')
    }
    
    if (params.loginHint) { body.login_hint = params.loginHint }
    if (params.acrValues) { body.acr_values = params.acrValues.join(' ') }
    if (params.scope) { body.scope = params.scope.join(' ') }
    if (params.bindingMessage) { body.binding_message = params.bindingMessage }
    
    // TODO: id_token_hint
    // TODO: login_hint
    // TODO: id_token_hint
    // TODO: login_hint
    // TODO: client authentication
    
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    const response = await fetch(this.authorizationURL, {
      method: 'POST',
      headers: headers,
      body: new URLSearchParams(body).toString(),
      // ...
    });
    
    var json = await response.json();
    //return json.auth_req_id;
    
    return await this.poll(json.auth_req_id)
  }
  
  async poll(reqId: string): Promise<Credentials> {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        var headers = {};
        const body = {
          grant_type: 'urn:openid:params:grant-type:ciba',
          auth_req_id: reqId,
          client_id: this.clientId
        }
        
        
        if (this.clientId && this.clientSecret) {
          headers['Authorization'] = 'Basic ' + Buffer.from([ this.clientId, this.clientSecret ].join(':')).toString('base64')
        }
        
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        const response = await fetch(this.tokenURL, {
          method: 'POST',
          headers: headers,
          body: new URLSearchParams(body).toString(),
          // ...
        });
        
        var json = await response.json();
        console.log('--- JSON ---');
        console.log(json);
        if (json.error == 'authorization_pending') { return; }
        if (json.error == 'access_denied') {
          clearInterval(interval);
          // TODO: reject with error
          return;
        }
  
        const credentials = {
          accessToken: {
            type: json.token_type || 'bearer', // FIXME: Auth0 is not returnin token_type
            value: json.access_token
          }
        }
        clearInterval(interval);
        return resolve(credentials);
      }, 5000);
    });
  }
}
