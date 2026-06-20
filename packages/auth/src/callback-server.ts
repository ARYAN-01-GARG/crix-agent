import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

export interface CallbackResult {
  code: string;
  state: string;
}

/**
 * Spins up a one-shot HTTP server on a random port that captures the OAuth
 * redirect and resolves with the code + state query params.
 */
export function startCallbackServer(expectedState: string): Promise<{ port: number; result: Promise<CallbackResult> }> {
  return new Promise((resolveSetup, rejectSetup) => {
    let resolveResult: (r: CallbackResult) => void;
    let rejectResult: (e: Error) => void;

    const result = new Promise<CallbackResult>((res, rej) => {
      resolveResult = res;
      rejectResult = rej;
    });

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<html><body><p>Authentication complete. You can close this tab.</p><script>window.close()</script></body></html>"
      );

      server.close();

      if (error) {
        rejectResult(new Error(`OAuth error: ${error}`));
        return;
      }
      if (!code || state !== expectedState) {
        rejectResult(new Error("Invalid OAuth callback: missing code or state mismatch"));
        return;
      }

      resolveResult({ code, state });
    });

    server.on("error", (err) => {
      rejectSetup(err);
      rejectResult(err);
    });

    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolveSetup({ port, result });
    });
  });
}
