using Acv.TokenService.Models;

namespace Acv.TokenService.Abstractions;

/// <summary>
/// Prepares and persists recording METADATA (+ secure Blob reference). The physical media file
/// always lives in Azure Blob Storage (BYOS) — this store never holds the bytes. See ADR-0006.
/// Real implementation writes to Dataverse (alex_acvrecording) in Phase 5/8.
/// </summary>
public interface IRecordingMetadataStore
{
    /// <summary>
    /// Create a pending recording metadata record. Throws if recording consent is not verified.
    /// </summary>
    Task<RecordingMetadata> PrepareAsync(RecordingMetadata metadata, CancellationToken ct = default);

    /// <summary>Update status / Blob reference once the file is finalized in Blob (BYOS).</summary>
    Task UpdateAsync(RecordingMetadata metadata, CancellationToken ct = default);
}
