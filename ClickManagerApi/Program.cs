using System.Text;
using ClickManagerApi.Data;
using ClickManagerApi.Models;
using ClickManagerApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// EF Core + SQL Server
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sql => sql.EnableRetryOnFailure(3)
    ));

builder.Services.AddControllers()
    .AddJsonOptions(o => {
        o.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        o.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddCors(opt =>
    opt.AddPolicy("FrontEnd", p =>
        p.WithOrigins(
            "http://127.0.0.1:5500",
            "http://localhost:5500",
            "http://localhost:3000",
            "http://192.168.0.10:5500",
            "https://SEU_USUARIO.github.io"
        ).AllowAnyHeader().AllowAnyMethod()));

// JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

// Services
builder.Services.Configure<EmailSettings>(
    builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IFileUploadService, FileUploadService>();
builder.Services.AddHttpContextAccessor();

var app = builder.Build();

// Auto-migration (InMemory uses EnsureCreated; SQL Server uses Migrate)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (db.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory")
        db.Database.EnsureCreated();
    else
        db.Database.Migrate();
}

app.UseCors("FrontEnd");
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Exposes Program to the test project (WebApplicationFactory<Program>)
public partial class Program { }
