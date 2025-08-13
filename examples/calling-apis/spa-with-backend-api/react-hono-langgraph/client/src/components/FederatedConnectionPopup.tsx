import { useCallback, useState } from "react";

import { getAuth0Client } from "../lib/auth0";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

import type { Auth0InterruptionUI } from "shared";

interface FederatedConnectionPopupProps {
  interrupt: Auth0InterruptionUI;
}

export function FederatedConnectionPopup({
  interrupt,
}: FederatedConnectionPopupProps) {
  const [isLoading, setIsLoading] = useState(false);

  const { connection, requiredScopes, resume } = interrupt;

  // Use Auth0 SPA SDK to request additional connection/scopes
  const startFederatedLogin = useCallback(async () => {
    try {
      setIsLoading(true);

      // Filter out empty scopes
      const validScopes = requiredScopes.filter(
        (scope: string) => scope && scope.trim() !== ""
      );

      // Get the Auth0 client and use loginWithPopup for federated connection
      const auth0Client = getAuth0Client();

      await auth0Client.loginWithPopup({
        authorizationParams: {
          connection: connection,
          connection_scope: validScopes.join(" "),
          prompt: "consent", // Force consent to ensure we get the federated connection
          access_type: "offline", // Request refresh tokens if needed
        },
      });

      setIsLoading(false);

      // Resume the interrupted tool after successful authorization
      if (typeof resume === "function") {
        resume();
      }
    } catch (error) {
      console.error("Federated login failed:", error);
      setIsLoading(false);

      // Even if login fails, we should clear the interrupt
      if (typeof resume === "function") {
        resume();
      }
    }
  }, [connection, requiredScopes, resume]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">
              Connecting to {connection.replace("-", " ")}...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-lg text-yellow-800">
          Authorization Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-yellow-700">
          To access your {connection.replace("-", " ")} data, you need to
          authorize this application.
        </p>
        <p className="text-xs text-yellow-600">
          Required permissions:{" "}
          {requiredScopes
            .filter((scope: string) => scope && scope.trim() !== "")
            .join(", ")}
        </p>
        <Button onClick={startFederatedLogin} className="w-full">
          Authorize {connection.replace("-", " ")}
        </Button>
      </CardContent>
    </Card>
  );
}
