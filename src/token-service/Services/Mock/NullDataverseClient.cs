using Acv.TokenService.Abstractions;
using Microsoft.Extensions.Logging;

namespace Acv.TokenService.Services.Mock;

/// <summary>
/// Phase 3 no-op Dataverse client. IsConfigured is always false so nothing connects to a real
/// environment. Logs intended writes only. Replaced by a real Web API / ServiceClient seam in Phase 5.
/// </summary>
public sealed class NullDataverseClient : IDataverseClient
{
    private readonly ILogger<NullDataverseClient> _logger;

    public NullDataverseClient(ILogger<NullDataverseClient> logger) => _logger = logger;

    public bool IsConfigured => false;

    public Task<string> CreateAsync(string entityLogicalName, IReadOnlyDictionary<string, object?> attributes, CancellationToken ct = default)
    {
        var id = Guid.NewGuid().ToString();
        _logger.LogInformation("NULL Dataverse Create {Entity} ({Count} attrs) -> {Id} (not persisted)",
            entityLogicalName, attributes.Count, id);
        return Task.FromResult(id);
    }

    public Task UpdateAsync(string entityLogicalName, string id, IReadOnlyDictionary<string, object?> attributes, CancellationToken ct = default)
    {
        _logger.LogInformation("NULL Dataverse Update {Entity} {Id} ({Count} attrs) (not persisted)",
            entityLogicalName, id, attributes.Count);
        return Task.CompletedTask;
    }
}
