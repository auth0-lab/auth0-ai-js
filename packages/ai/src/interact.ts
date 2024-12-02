import { Authorizer, AuthorizationOptions, isPending } from './authorizer';
import { StateStore } from './state/state-store';
import { AuthorizationError } from './errors/authorizationerror';
import { agentAsyncStorage } from './async-storage';

/**
 * Make `fn` interactive by supplying it with authentication context and
 * orchestrating authentication and authorization ceremonies when necessary.
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
 * Authentication context is made available to `fn` (and any callbacks or promise
 * chains it propagates) via an instance of {@link https://nodejs.org/docs/latest/api/async_context.html#class-asynclocalstorage AsyncLocalStorage}.
 * Functions can access this context by requiring `import`ing
 * '@auth0/ai/user', '@auth0/ai/session', and `'@auth0/ai/tokens'`.
 *
 * Interaction is triggered by throwing an `AuthorizationError` from `fn`.  The
 * `AuthorizationError` represents a challenge that must be successfully
 * completed in order to execute the function.  Challenge parameters indicate
 * the required authentication and authorization context.
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
 *
 * It is recommended that an `authorizer` implements a standard authorization
 * protocol.  This package provides authorizers that implement {@link https://openid.net/specs/openid-client-initiated-backchannel-authentication-core-1_0.html OpenID Connect CIBA}.
 *
 * Interaction is particularly well suited to AI agents making use of tools as
 * part of executing a task.  Tool functions throw `AuthorizationError`s,
 * typically upon receiving an `HTTP 401` response from an API.  Such challenges
 * can be used to bring a human-in-the-loop when the agent attempts a task that
 * requires approval, such as transfering a certain amount of money.
 *
 * An application that wraps `fn` for interaction is said to be "hosting" that
 * function.  The function can be hosted in a variety of different interaction
 * contexts, without the function itself being aware.   The interaction context
 * can be tailord to the environment by passing the appropriate `authorizer`
 * implementation.  For instance, an agent running autonomously in the
 * background can interact with the user via out-of-band channels by using a
 * CIBA authorizer.   The same agent running in an input constrained device
 * (such as a smart TV app) can use a device flow authorizer.
 *
 * Often times, agents are deployed in situations where logic is invoked as
 * stateless HTTP endpoints.   In such scenarios, an optional `store` can be
 * used to persist context while authorization is being obtained.  Once
 * obtained, `fn` can be resumed later.
 *
 * @param fn - The function to wrap with interaction.
 * @param authorizer - Orchestrates interaction with the user.
 * @param store - Persist context for later resumption.
 */
export function interact(fn, authorizer: Authorizer, store?: StateStore) {
  
  const ifn = async function(ctx, ...args) {
    
    return agentAsyncStorage.run(ctx, async () => {
      const shared = agentAsyncStorage.getStore();
      try {
        return await fn.apply(undefined, args);
      } catch (error) {
        if (error instanceof AuthorizationError) {
          // The function threw an `AuthorizationError`, indicating that the
          // authentication context is not sufficient.  This error _may_ be
          // remediable by authenticating the user or obtaining their consent.
          var params: AuthorizationOptions = {};
          if (shared.user) {
            params.loginHint = shared.user.id;
          }
          
          params.acrValues = error.acrValues;
          params.maxAge = error.maxAge;
          params.scope = error.scope;
          params.realm = error.realm;
          
          var result = await authorizer.authorize(params);
          if (isPending(result)) {
            // The authorization result is pending.  A notification will be sent
            // when the result is available.  This pattern is typically used to
            // implement "stateless" agents, where logic is invoked via HTTP
            // endpoints.  Depending on the deployment architecture, logic may
            // resume on an entirely separate process than the current one which
            // triggered the authorization request.   As such, the context of
            // the authorization transaction is saved so it can later be resumed
            // when the result is available.
            var d: any = { requestId: result.requestId, arguments: args }
            // TODO: Filter context better to include all things except tokens
            d.context = {
              user: shared.user,
              session: shared.session
            }
            await store.save(result.transactionId, d);
            return;
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
