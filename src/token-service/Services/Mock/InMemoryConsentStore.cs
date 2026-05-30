using System.Collections.Concurrent;
using Acv.TokenService.Abstractions;
using Acv.TokenService.Models;
using Microsoft.Extensions.Logging;

namespace Acv.TokenService.Services.Mock;

/// <summary>Phase 3 in-memory consent store. Replaced by Dataverse (alex_acvconsent) in Phase 5.</summary>
public sealed class InMemoryConsentStore : IConsentStore
{
    private readonly ILogger<InMemoryConsentStore> _logger;
    private readonly ConcurrentDictionary<string, ConsentRecord> _byId = new();
    private readonly ConcurrentDictionary<string, bool> _recordingGranted = new();

    public InMemoryConsentStore(ILogger<InMemoryConsentStore> logger) => _logger = logger;

    public Task<ConsentResult> CaptureAsync(ConsentRecord record, CancellationToken ct = default)
    {
        var consentId = $"consent-{Guid.NewGuid():N}";
        _byId[consentId] = record;

        var accepted = string.Equals(record.Value, "Granted", StringComparison.OrdinalIgnoreCase);
        if (string.Equals(record.ConsentType, "Recording", StringComparison.OrdinalIgnoreCase))
            _recordingGranted[record.SessionId] = accepted;

        _logger.LogInformation("MOCK CaptureConsent type={Type} value={Value} session={SessionId} -> {ConsentId}",
            record.ConsentType, record.Value, record.SessionId, consentId);

        return Task.FromResult(new ConsentResult
        {
            SessionId = record.SessionId,
            Accepted = accepted,
            ConsentId = consentId,
            IsMock = true
        });
    }

    public Task<bool> IsRecordingConsentGrantedAsync(string sessionId, CancellationToken ct = default)
        => Task.FromResult(_recordingGranted.TryGetValue(sessionId, out var granted) && granted);
}
