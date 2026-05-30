using Acv.TokenService.Models;

namespace Acv.TokenService.Abstractions;

/// <summary>
/// Issues short-lived ACS identities and tokens. Real implementation (Phase 3b+, after approval)
/// uses the ACS Identity SDK with Managed Identity. The Phase 3 mock returns fake values.
/// The ACS connection string / keys are NEVER exposed to the client.
/// </summary>
public interface IAcsTokenService
{
    /// <summary>Create (or map) an ACS identity and mint a short-lived voip token.</summary>
    Task<TokenResponse> IssueTokenAsync(TokenRequest request, CancellationToken ct = default);

    /// <summary>Clean up an ephemeral (anonymous) ACS identity when the session ends.</summary>
    Task DeleteIdentityAsync(string acsUserId, CancellationToken ct = default);
}
