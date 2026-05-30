using System.Collections.Concurrent;
using Acv.TokenService.Abstractions;
using Acv.TokenService.Models;
using Microsoft.Extensions.Logging;

namespace Acv.TokenService.Services.Mock;

/// <summary>Phase 3 mock. Tracks sessions in memory. NO real ACS Rooms / Call Automation calls.</summary>
public sealed class MockAcsSessionService : IAcsSessionService
{
    private readonly ILogger<MockAcsSessionService> _logger;
    private readonly ConcurrentDictionary<string, SessionResponse> _sessions = new();

    public MockAcsSessionService(ILogger<MockAcsSessionService> logger) => _logger = logger;

    public Task<SessionResponse> CreateSessionAsync(SessionRequest request, CancellationToken ct = default)
    {
        var session = new SessionResponse
        {
            SessionId = $"sess-{Guid.NewGuid():N}",
            RoomId = $"room-{Guid.NewGuid():N}",
            Status = "Pending",
            ValidUntil = DateTimeOffset.UtcNow.AddHours(8),
            IsMock = true
        };
        _sessions[session.SessionId] = session;
        _logger.LogInformation("MOCK CreateSession mode={ChannelMode} entryPoint={EntryPoint} -> {SessionId}",
            request.ChannelMode, request.EntryPoint, session.SessionId);
        return Task.FromResult(session);
    }

    public Task AssignRoleAsync(string sessionId, string acsUserId, ParticipantRole role, CancellationToken ct = default)
    {
        _logger.LogInformation("MOCK AssignRole {Role} to {AcsUserId} on {SessionId}", role, acsUserId, sessionId);
        return Task.CompletedTask;
    }

    public Task UpdateStatusAsync(string sessionId, string status, CancellationToken ct = default)
    {
        if (_sessions.TryGetValue(sessionId, out var existing))
            _sessions[sessionId] = existing with { Status = status };
        _logger.LogInformation("MOCK UpdateStatus {SessionId} -> {Status}", sessionId, status);
        return Task.CompletedTask;
    }
}
