using Acv.TokenService.Models;

namespace Acv.TokenService.Abstractions;

/// <summary>
/// Creates and manages ACS Room / call session lifecycle and participant roles.
/// Real implementation uses ACS Rooms + Call Automation (Phase 4, after approval).
/// </summary>
public interface IAcsSessionService
{
    /// <summary>Create (or resolve) an ACS Room / session for an interaction.</summary>
    Task<SessionResponse> CreateSessionAsync(SessionRequest request, CancellationToken ct = default);

    /// <summary>Assign a participant a role on the session's Room.</summary>
    Task AssignRoleAsync(string sessionId, string acsUserId, ParticipantRole role, CancellationToken ct = default);

    /// <summary>Update the lifecycle status of a session.</summary>
    Task UpdateStatusAsync(string sessionId, string status, CancellationToken ct = default);
}
