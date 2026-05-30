using System.Text.Json;
using Acv.TokenService.Abstractions;
using Acv.TokenService.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace Acv.TokenService.Functions;

/// <summary>
/// POST /api/consent — captures consent evidence BEFORE any media/recording begins.
/// Phase 3: persists to an in-memory store only. Replaced by Dataverse (alex_acvconsent) in Phase 5.
/// </summary>
public sealed class CaptureConsentFunction
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IConsentStore _consentStore;
    private readonly ILogger<CaptureConsentFunction> _logger;

    public CaptureConsentFunction(IConsentStore consentStore, ILogger<CaptureConsentFunction> logger)
    {
        _consentStore = consentStore;
        _logger = logger;
    }

    [Function("CaptureConsent")]
    public async Task<IActionResult> RunAsync(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "consent")] HttpRequest req,
        CancellationToken ct)
    {
        ConsentRecord? record = null;
        try
        {
            record = await JsonSerializer.DeserializeAsync<ConsentRecord>(req.Body, JsonOptions, ct);
        }
        catch (JsonException) { /* fall through to 400 */ }

        if (record is null || string.IsNullOrWhiteSpace(record.SessionId))
        {
            return new BadRequestObjectResult("sessionId and a valid consent body are required.");
        }

        var result = await _consentStore.CaptureAsync(record, ct);
        return new OkObjectResult(result);
    }
}
