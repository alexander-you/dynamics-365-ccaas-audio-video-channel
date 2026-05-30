using System.Collections.Concurrent;
using Acv.TokenService.Abstractions;
using Acv.TokenService.Models;
using Microsoft.Extensions.Logging;

namespace Acv.TokenService.Services.Mock;

/// <summary>
/// Phase 3 in-memory recording metadata store. Enforces the consent gate before "preparing"
/// a recording. Replaced by Dataverse (alex_acvrecording) + Blob BYOS in Phase 5/8. See ADR-0006.
/// </summary>
public sealed class InMemoryRecordingMetadataStore : IRecordingMetadataStore
{
    private readonly ILogger<InMemoryRecordingMetadataStore> _logger;
    private readonly ConcurrentDictionary<string, RecordingMetadata> _bySession = new();

    public InMemoryRecordingMetadataStore(ILogger<InMemoryRecordingMetadataStore> logger) => _logger = logger;

    public Task<RecordingMetadata> PrepareAsync(RecordingMetadata metadata, CancellationToken ct = default)
    {
        if (!metadata.ConsentVerified)
            throw new InvalidOperationException("Recording cannot be prepared: consent not verified for session " + metadata.SessionId);

        var prepared = metadata with
        {
            RecordingId = metadata.RecordingId ?? $"rec-{Guid.NewGuid():N}",
            Status = "Recording"
        };
        _bySession[prepared.SessionId] = prepared;

        _logger.LogInformation("MOCK PrepareRecording session={SessionId} storageMode={StorageMode} -> {RecordingId}",
            prepared.SessionId, prepared.StorageMode, prepared.RecordingId);
        return Task.FromResult(prepared);
    }

    public Task UpdateAsync(RecordingMetadata metadata, CancellationToken ct = default)
    {
        _bySession[metadata.SessionId] = metadata;
        _logger.LogInformation("MOCK UpdateRecording session={SessionId} status={Status} blobUri={HasBlob}",
            metadata.SessionId, metadata.Status, metadata.BlobUri is not null);
        return Task.CompletedTask;
    }
}
