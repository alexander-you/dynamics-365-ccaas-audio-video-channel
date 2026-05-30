namespace Acv.TokenService.Models;

/// <summary>
/// Consent captured at the entry point BEFORE any media/recording begins.
/// Persisted to Dataverse (alex_acvconsent) in Phase 5. Phase 3: shape + in-memory store.
/// </summary>
public sealed record ConsentRecord
{
    public required string SessionId { get; init; }
    public string? ContactId { get; init; }

    /// <summary>Recording | Transcription | DataUse.</summary>
    public string ConsentType { get; init; } = "Recording";

    /// <summary>Granted | Denied | Withdrawn.</summary>
    public required string Value { get; init; }

    public DateTimeOffset CapturedAt { get; init; } = DateTimeOffset.UtcNow;
    public string? Jurisdiction { get; init; }

    /// <summary>How the disclosure was presented (e.g., WebEntryPoint).</summary>
    public string DisclosureChannel { get; init; } = "WebEntryPoint";

    /// <summary>The exact disclosure text shown (evidence).</summary>
    public string? DisclosureText { get; init; }
}

public sealed record ConsentResult
{
    public required string SessionId { get; init; }
    public required bool Accepted { get; init; }
    public required string ConsentId { get; init; }
    public bool IsMock { get; init; }
}
