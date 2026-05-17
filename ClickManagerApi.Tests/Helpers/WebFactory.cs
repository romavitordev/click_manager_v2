using ClickManagerApi.Data;
using ClickManagerApi.Models;
using ClickManagerApi.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ClickManagerApi.Tests.Helpers;

public class WebFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = $"TestDb_{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, cfg) =>
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"]                      = "test-key-32-chars-minimum-for-hmac-sha256-ok!",
                ["Jwt:Issuer"]                   = "ClickManagerTest",
                ["Jwt:Audience"]                 = "ClickManagerTestClient",
                ["Jwt:ExpirationHours"]          = "24",
                ["EmailSettings:SmtpHost"]       = "localhost",
                ["EmailSettings:SmtpPort"]       = "1025",
                ["EmailSettings:SenderName"]     = "Test",
                ["EmailSettings:SenderEmail"]    = "test@test.com",
                ["EmailSettings:SenderPassword"] = "test",
                ["EmailSettings:AdminEmail"]     = "admin@test.com"
            }));

        builder.ConfigureServices(services =>
        {
            // Swap SQL Server → InMemory (unique DB per factory instance)
            var dbDesc = services.SingleOrDefault(d =>
                d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
            if (dbDesc is not null) services.Remove(dbDesc);
            services.AddDbContext<ApplicationDbContext>(opt =>
                opt.UseInMemoryDatabase(_dbName));

            // Swap real file upload (writes to disk) → no-op fake
            var uploadDesc = services.SingleOrDefault(d =>
                d.ServiceType == typeof(IFileUploadService));
            if (uploadDesc is not null) services.Remove(uploadDesc);
            services.AddScoped<IFileUploadService, FakeFileUploadService>();

            // Swap real email service (connects to SMTP) → no-op fake
            var emailDesc = services.SingleOrDefault(d =>
                d.ServiceType == typeof(IEmailService));
            if (emailDesc is not null) services.Remove(emailDesc);
            services.AddScoped<IEmailService, FakeEmailService>();
        });
    }
}

public class FakeFileUploadService : IFileUploadService
{
    public Task<string> UploadAsync(IFormFile file, string subfolder)
        => Task.FromResult(
            $"http://localhost/uploads/{subfolder}/{Guid.NewGuid()}{Path.GetExtension(file.FileName)}");

    public void Delete(string url) { }
}

public class FakeEmailService : IEmailService
{
    public Task SendContactEmailsAsync(ContactRequest request) => Task.CompletedTask;
}
