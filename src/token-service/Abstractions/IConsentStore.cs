using Acv.TokenService.Models;

namespace Acv.TokenService.Abstractions;

/// <summary>
/// Stores consent evidence. Real implementation writes to Dataverse (alex_acvconsent) in Phase 5.
/// Consent MUST be captured and verified before any media/recording starts.
/// </summary>
public interface IConsentStore
{
    Task<ConsentResult> CaptureAsync(ConsentRecord record, CancellationToken ct = default);

    /// <summary>True only if a Granted recording consent exists for the session.</summary>
    Task<bool> IsRecordingConsentGrantedAsync(string sessionId, CancellationToken ct = default);
}
