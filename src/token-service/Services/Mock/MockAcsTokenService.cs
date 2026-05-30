using Acv.TokenService.Abstractions;
using Acv.TokenService.Models;
using Microsoft.Extensions.Logging;

namespace Acv.TokenService.Services.Mock;

/// <summary>
/// Phase 3 mock. Returns deterministic fake ACS identities/tokens. NO real ACS calls.
/// The "token" is an opaque placeholder string and is NOT a valid ACS credential.
/// </summary>
public sealed class MockAcsTokenService : IAcsTokenService
{
    private readonly ILogger<MockAcsTokenService> _logger;
    private readonly int _ttlMinutes;

    public MockAcsTokenService(ILogger<MockAcsTokenService> logger)
    {
        _logger = logger;
        _ttlMinutes = int.TryParse(Environment.GetEnvironmentVariable("TOKEN_TTL_MINUTES"), out var t) ? t : 60;
    }

    public Task<TokenResponse> IssueTokenAsync(TokenRequest request, CancellationToken ct = default)
    {
        var acsUserId = $"8:acs:mock-{Guid.NewGuid():N}";
        var sessionId = $"sess-{Guid.NewGuid():N}";
        _logger.LogInformation("MOCK IssueToken entryPoint={EntryPoint} anonymous={Anonymous} -> {AcsUserId}",
            request.EntryPoint, request.Anonymous, acsUserId);

        var response = new TokenResponse
        {
            AcsUserId = acsUserId,
            Token = $"MOCK.{Convert.ToBase64String(Guid.NewGuid().ToByteArray())}.NOT_A_REAL_TOKEN",
            ExpiresOn = DateTimeOffset.UtcNow.AddMinutes(_ttlMinutes),
            SessionId = sessionId,
            RoomId = $"room-{Guid.NewGuid():N}",
            IsMock = true
        };
        return Task.FromResult(response);
    }

    public Task DeleteIdentityAsync(string acsUserId, CancellationToken ct = default)
    {
        _logger.LogInformation("MOCK DeleteIdentity {AcsUserId}", acsUserId);
        return Task.CompletedTask;
    }
}
