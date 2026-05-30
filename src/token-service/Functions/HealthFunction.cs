using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace Acv.TokenService.Functions;

/// <summary>GET /api/health — liveness probe and mock-mode indicator for local testing.</summary>
public sealed class HealthFunction
{
    [Function("Health")]
    public IActionResult Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")] HttpRequest req)
    {
        var useMocks = !string.Equals(Environment.GetEnvironmentVariable("USE_MOCKS"), "false",
            StringComparison.OrdinalIgnoreCase);

        return new OkObjectResult(new
        {
            status = "ok",
            service = "acv-token-service",
            useMocks,
            utc = DateTimeOffset.UtcNow
        });
    }
}
