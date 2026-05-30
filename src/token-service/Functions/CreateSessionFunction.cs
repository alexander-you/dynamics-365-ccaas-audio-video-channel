using System.Text.Json;
using Acv.TokenService.Abstractions;
using Acv.TokenService.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace Acv.TokenService.Functions;

/// <summary>
/// POST /api/session — creates (mock) an ACS Room/session for an interaction.
/// Phase 3: returns MOCK values only. No real ACS Rooms / Call Automation is invoked.
/// </summary>
public sealed class CreateSessionFunction
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IAcsSessionService _sessionService;
    private readonly ILogger<CreateSessionFunction> _logger;

    public CreateSessionFunction(IAcsSessionService sessionService, ILogger<CreateSessionFunction> logger)
    {
        _sessionService = sessionService;
        _logger = logger;
    }

    [Function("CreateSession")]
    public async Task<IActionResult> RunAsync(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "session")] HttpRequest req,
        CancellationToken ct)
    {
        SessionRequest request;
        try
        {
            request = await JsonSerializer.DeserializeAsync<SessionRequest>(req.Body, JsonOptions, ct)
                      ?? new SessionRequest();
        }
        catch (JsonException)
        {
            return new BadRequestObjectResult("Invalid JSON body.");
        }

        var result = await _sessionService.CreateSessionAsync(request, ct);
        return new ObjectResult(result) { StatusCode = StatusCodes.Status201Created };
    }
}
