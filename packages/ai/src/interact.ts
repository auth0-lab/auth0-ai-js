import { agentAsyncStorage } from './async-storage';
import { AuthorizationOptions, AuthorizationError } from './errors/authorizationerror';

/**
 * Make `fn` interactive with authentication and authorization ceremonies.
 *
 * @remarks
 * This functions wraps `fn`, interacting with the user when authentication or
 * authorization is needed to execute `fn`.  This interaction is known as a
 * ceremony, which is an extension of the concept of a network protocol to
 * include human nodes alongside computer nodes.  Communication links in a
 * ceremony may include user interfaces and human-to-human communication.  The
 * goal of the ceremony is to obtain credentials with the necessary
 * authentication and/or authorization context to execute `fn`.
 *
 * Interaction is triggered by throwing an `AuthorizationError` from `fn`.  The
 * `AuthorizationError` represents a challenge that must be successfully
 * completed in order to execute the function.  Challenge parameters indicate
 * the required authentication and authorization context.
 *
 * This is particularly well suited to AI agents making use of tools as part of
 * executing a task.  Tool functions throw `AuthorizationError`s, typically upon
 * receiving an `HTTP 401` response from an API.  Such challenges can be used to
 * bring a human-in-the-loop when the agent attempts a task that requires
 * approval, such as transfering a certain amount of money.
 *
 * It is recommended that HTTP APIs respond with challenges containing
 * parameters standardized by {@link https://datatracker.ietf.org/doc/html/rfc6750 RFC 6750}
 * and {@link https://datatracker.ietf.org/doc/html/rfc9470 RFC 9470}.  This is
 * not required, however, and it is up to functions to parse errors and throw
 * exceptions accordingly.
 *
 * Interaction with the user is orchestrated by the `authorizer`.  The
 * authorizer typically relays the authorization challenge to an authorization
 * server, which then interacts with the user.  Once authorization has been
 * obtained, a new set of credentials are issued and `fn` is re-executed.
 */
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
            
            var d: any = { requestId: result.requestId, arguments: args }
            // TODO: Filter context better to include all things except tokens
            d.context = {
              user: store.user,
              session: store.session
            }
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
