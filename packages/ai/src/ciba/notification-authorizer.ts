import { Authorizer } from '../authorizer'
import { AuthorizationError, AuthorizationOptions } from '../errors/authorizationerror'
import { CIBAAuthorizerOptions } from './polling-authorizer'
import { StateStore } from '../state/state-store'
import { randomBytes } from 'crypto';
import { promisify } from 'util';

const randomBytesPromise = promisify(randomBytes);

interface NotificationCIBAAuthorizerOptions extends CIBAAuthorizerOptions {
  store?: StateStore;
}


export class NotificationCIBAAuthorizer implements Authorizer {
  authorizationURL
  tokenURL
  clientId
  clientSecret
  store: StateStore
  
  constructor(options: NotificationCIBAAuthorizerOptions) {
    this.authorizationURL = options.authorizationURL;
    this.tokenURL = options.tokenURL;
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.store = options.store;  // TODO: make default in-memory store
  }
  
  async authorize(params: AuthorizationOptions) {
    console.log('NOTIFICATION AUTHORIZE...');
    
    const bytes = await randomBytesPromise(20);
    const token = bytes.toString('base64url');
    console.log(token)
    
    
    var headers = {};
    var body: {
      login_hint?: string;
      acr_values?: string;
      scope?: string
      binding_message?: string
      client_notification_token?: string
    } = {}
    
    if (this.clientId && this.clientSecret) {
      headers['Authorization'] = 'Basic ' + Buffer.from([ this.clientId, this.clientSecret ].join(':')).toString('base64')
    }
    
    if (params.loginHint) { body.login_hint = params.loginHint }
    if (params.acrValues) { body.acr_values = params.acrValues.join(' ') }
    if (params.scope) { body.scope = params.scope.join(' ') }
    if (params.bindingMessage) { body.binding_message = params.bindingMessage }
    body.client_notification_token = token;
    
    console.log(body);
    
    console.log('SENDING REQUEST');
    
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    const response = await fetch(this.authorizationURL, {
      method: 'POST',
      headers: headers,
      body: new URLSearchParams(body).toString(),
      // ...
    });
    
    var json = await response.json();
    
    console.log(json)
    //return json.auth_req_id;
    
    //return await this.poll(json.auth_req_id)
    
    
    // TODO: get the arguments from context...
    var d = { authReqId: json.auth_req_id, state: { foo: 'bar' } }
    
    await this.store.save(token, d);
    
    
    return await this.wait(json.auth_req_id)
  }
  
  // TODO: make this private
  async wait(reqId: string) {
    console.log('waiting for notification: ' + reqId);
  }
  
  
}

