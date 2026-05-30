namespace Acv.TokenService.Models;

/// <summary>
/// Recording metadata + SECURE REFERENCE to the media file.
/// IMPORTANT: the physical audio/video bytes live in Azure Blob Storage (BYOS) — NEVER here.
/// Persisted to Dataverse (alex_acvrecording) in Phase 5/8. See ADR-0006.
/// </summary>
public sealed record RecordingMetadata
{
    public required string SessionId { get; init; }
    public string? RecordingId { get; init; }

    /// <summary>mp4 | mp3 | wav.</summary>
    public string Format { get; init; } = "mp4";

    /// <summary>Mixed | Unmixed.</summary>
    public string Mode { get; init; } = "Mixed";

    /// <summary>AzureBlobBYOS (MVP default) | ACSDefault24h | DataverseFile (demo-only).</summary>
    public string StorageMode { get; init; } = "AzureBlobBYOS";

    /// <summary>Secure reference to the media file in Blob (URI) — not the bytes.</summary>
    public string? BlobUri { get; init; }

    /// <summary>Key Vault secret name / MI scope used to retrieve the file — never a literal SAS.</summary>
    public string? BlobCredentialRef { get; init; }

    /// <summary>Recording | Available | Failed | Deleted.</summary>
    public string Status { get; init; } = "Recording";

    public DateTimeOffset? RetentionUntil { get; init; }

    /// <summary>Compliance gate: recording must not start unless consent is verified.</summary>
    public bool ConsentVerified { get; init; }
}
