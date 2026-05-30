using Acv.TokenService.Abstractions;
using Acv.TokenService.Services.Mock;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices(services =>
    {
        services
            .AddApplicationInsightsTelemetryWorkerService()
            .ConfigureFunctionsApplicationInsights();

        // -------------------------------------------------------------------
        // Service registration.
        // Phase 3 ships MOCK implementations only — nothing connects to real
        // ACS/Dataverse. USE_MOCKS defaults to true. Real implementations are
        // introduced in later phases (after Azure + Dynamics 365 approvals)
        // behind the same interfaces.
        // -------------------------------------------------------------------
        var useMocks = !string.Equals(
            Environment.GetEnvironmentVariable("USE_MOCKS"), "false", StringComparison.OrdinalIgnoreCase);

        if (!useMocks)
        {
            // Real implementations are added in later phases. Fail fast until then.
            throw new InvalidOperationException(
                "USE_MOCKS=false but no real implementations are registered yet. " +
                "Real ACS/Dataverse services are introduced after Azure and Dynamics 365 approvals.");
        }

        services.AddSingleton<IAcsTokenService, MockAcsTokenService>();
        services.AddSingleton<IAcsSessionService, MockAcsSessionService>();
        services.AddSingleton<IConsentStore, InMemoryConsentStore>();
        services.AddSingleton<IRecordingMetadataStore, InMemoryRecordingMetadataStore>();
        services.AddSingleton<IDataverseClient, NullDataverseClient>();
    })
    .Build();

host.Run();
