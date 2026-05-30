using System.Text.Json;
using Acv.TokenService.Abstractions;
using Acv.TokenService.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace Acv.TokenService.Functions;

/// <summary>
/// POST /api/token — issues a short-lived ACS token + session for the customer entry point.
/// Phase 3: returns MOCK values only. No real ACS identity/token is created.
/// </summary>
public sealed class IssueTokenFunction
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IAcsTokenService _tokenService;
    private readonly ILogger<IssueTokenFunction> _logger;

    public IssueTokenFunction(IAcsTokenService tokenService, ILogger<IssueTokenFunction> logger)
    {
        _tokenService = tokenService;
        _logger = logger;
    }

    [Function("IssueToken")]
    public async Task<IActionResult> RunAsync(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "token")] HttpRequest req,
        CancellationToken ct)
    {
        TokenRequest request;
        try
        {
            request = await JsonSerializer.DeserializeAsync<TokenRequest>(req.Body, JsonOptions, ct)
                      ?? new TokenRequest();
        }
        catch (JsonException)
        {
            return new BadRequestObjectResult("Invalid JSON body.");
        }

        var result = await _tokenService.IssueTokenAsync(request, ct);
        return new OkObjectResult(result);
    }
}
