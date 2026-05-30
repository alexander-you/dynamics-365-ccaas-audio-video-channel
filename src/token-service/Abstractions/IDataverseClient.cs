namespace Acv.TokenService.Abstractions;

/// <summary>
/// Thin seam for future Dataverse integration (Phase 5). Phase 3 ships a Null implementation
/// so nothing connects to a real environment. Real implementation uses the Dataverse Web API /
/// ServiceClient with Managed Identity. Tables use the 'alex' prefix (placeholder).
/// </summary>
public interface IDataverseClient
{
    /// <summary>True when a real, configured Dataverse connection is available.</summary>
    bool IsConfigured { get; }

    /// <summary>Create a row in a Dataverse table and return its id.</summary>
    Task<string> CreateAsync(string entityLogicalName, IReadOnlyDictionary<string, object?> attributes, CancellationToken ct = default);

    /// <summary>Update a row in a Dataverse table.</summary>
    Task UpdateAsync(string entityLogicalName, string id, IReadOnlyDictionary<string, object?> attributes, CancellationToken ct = default);
}
