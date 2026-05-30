namespace Acv.TokenService.Models;

/// <summary>Request to create (or resolve) an ACS Room / call session for an interaction.</summary>
public sealed record SessionRequest
{
    public string EntryPoint { get; init; } = "Public";
    public bool Anonymous { get; init; } = true;
    public string? ContactId { get; init; }
    public string? CaseId { get; init; }
    public string? ChannelConfig { get; init; }

    /// <summary>Audio | Video — the requested media mode.</summary>
    public string ChannelMode { get; init; } = "Video";
}

/// <summary>Result of creating/resolving a session.</summary>
public sealed record SessionResponse
{
    public required string SessionId { get; init; }
    public required string RoomId { get; init; }

    /// <summary>Pending | Routing | Active | Completed | Failed | Abandoned.</summary>
    public required string Status { get; init; }

    public DateTimeOffset CreatedOn { get; init; } = DateTimeOffset.UtcNow;

    /// <summary>Validity window end for the Room (when applicable).</summary>
    public DateTimeOffset? ValidUntil { get; init; }

    public bool IsMock { get; init; }
}

/// <summary>Participant roles mapped onto ACS Room roles.</summary>
public enum ParticipantRole
{
    /// <summary>Customer — ACS Room Attendee.</summary>
    Customer,
    /// <summary>Agent — ACS Room Presenter.</summary>
    Agent,
    /// <summary>Supervisor — ACS Room Consumer (muted) for monitor; promote for barge.</summary>
    Supervisor,
    /// <summary>Internal expert via ACS or Teams interop.</summary>
    Expert
}
