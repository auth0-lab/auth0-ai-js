import { agentAsyncStorage } from './async-storage';
import { AuthorizationOptions, AuthorizationError } from './errors/authorizationerror';

export function interact(fn, authorizer, stateStore) {
  
  const ifn = async function(ctx, ...args) {
    console.log('ABOUT TO RUN...');
    console.log(ctx)
    
    return agentAsyncStorage.run(ctx, async () => {
      const store = agentAsyncStorage.getStore();
      
      console.log('START INTERACTION');
      console.log(store)
      
      
      try {
        return await fn.apply(undefined, args);
      } catch (error) {
        console.log('EXCEPTION HANDLED');
        console.log(store)
        
        if (error instanceof AuthorizationError) {
          // The function threw an `AuthorizationError`, indicating that the
          // authentication context is not sufficient.  This error _may_ be
          // remediable by authenticating the user or obtaining their consent.
          //
          // This error is typically the result of an HTTP authentication
          // challenge received at run-time.  Endpoints that respond with such
          // challenges are encouraged to use the attributes defined by
          // [RFC 6750][1] and [RFC 9470][2].  These attributes convey the
          // necessary authorization requirements, which are relayed in the
          // authorization request to the authorization server.   The
          // authorization server then interacts with user as necessary to
          // meet those requirements.
          //
          // [1]: https://datatracker.ietf.org/doc/html/rfc6750
          // [2]: https://datatracker.ietf.org/doc/html/rfc9470
          
          var params: AuthorizationOptions = {};
          if (store.user) {
            params.loginHint = store.user.id;
          }
          
          params.acrValues = error.acrValues;
          params.maxAge = error.maxAge;
          params.scope = error.scope;
          params.realm = error.realm;
          
          var result = await authorizer.authorize(params);
          console.log('token is!');
          console.log(result)
          
          if (result.transactionId) {
            console.log('NO TOKEN, STATELESS...');
            
            var d: any = { requestId: result.requestId, state: args }
            d.session = store.session;
            await stateStore.save(result.transactionId, d);
            return
          }
          
          
          ctx.tokens = result;
          // TODO: call this not within `run` to avoid nexted context?
          return ifn.apply(undefined, arguments);
        }
        
        throw error;
      }
    });
  };
  
  return ifn;
}
