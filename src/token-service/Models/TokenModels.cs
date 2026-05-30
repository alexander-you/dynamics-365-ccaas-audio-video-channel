namespace Acv.TokenService.Models;

/// <summary>
/// Request from the customer entry point to obtain an ACS token and a session to join.
/// Phase 3: shape only. No real ACS identity is created in mock mode.
/// </summary>
public sealed record TokenRequest
{
    /// <summary>True for anonymous customers; false when mapped to a known contact.</summary>
    public bool Anonymous { get; init; } = true;

    /// <summary>Optional Dataverse contact id when the customer is authenticated (Phase 5).</summary>
    public string? ContactId { get; init; }

    /// <summary>Optional case (incident) id to link the session to (Phase 5).</summary>
    public string? CaseId { get; init; }

    /// <summary>Entry point origin: Portal | Public | AuthArea | Mobile.</summary>
    public string EntryPoint { get; init; } = "Public";

    /// <summary>Channel configuration name/id to apply (alex_acvchannelconfig). Optional in Phase 3.</summary>
    public string? ChannelConfig { get; init; }
}

/// <summary>Response returned to the client: the token plus the minimum session info to join.</summary>
public sealed record TokenResponse
{
    public required string AcsUserId { get; init; }
    public required string Token { get; init; }
    public required DateTimeOffset ExpiresOn { get; init; }
    public required string SessionId { get; init; }
    public string? RoomId { get; init; }

    /// <summary>True when produced by a mock service (no real ACS identity/token).</summary>
    public bool IsMock { get; init; }
}
