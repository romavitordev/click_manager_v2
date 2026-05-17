using ClickManagerApi.Data;
using ClickManagerApi.Models;
using ClickManagerApi.Models.Entities;
using ClickManagerApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClickManagerApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IAuthService         _auth;

    public AuthController(ApplicationDbContext db, IAuthService auth)
    {
        _db   = db;
        _auth = auth;
    }

    // POST /api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var fotografo = await _db.Fotografos
            .FirstOrDefaultAsync(f => f.Email == req.Email);

        if (fotografo is null || !BCrypt.Net.BCrypt.Verify(req.Senha, fotografo.SenhaHash))
            return Unauthorized(new { message = "Email ou senha inválidos." });

        return Ok(BuildResponse(fotografo));
    }

    // POST /api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (await _db.Fotografos.AnyAsync(f => f.Email == req.Email))
            return Conflict(new { message = "Este e-mail já está cadastrado." });

        var fotografo = new Fotografo
        {
            Nome         = req.Nome,
            Email        = req.Email,
            SenhaHash    = BCrypt.Net.BCrypt.HashPassword(req.Senha),
            Telefone     = req.Telefone,
            PlanoAtivo   = req.PlanoAtivo,
            CriadoEm    = DateTime.UtcNow,
            AtualizadoEm = DateTime.UtcNow
        };

        _db.Fotografos.Add(fotografo);
        await _db.SaveChangesAsync();

        return Created($"/api/fotografos/{fotografo.Id}", BuildResponse(fotografo));
    }

    private AuthResponse BuildResponse(Fotografo f) => new()
    {
        Token     = _auth.GenerateToken(f),
        ExpiresAt = DateTime.UtcNow.AddHours(24),
        Fotografo = new FotografoDto
        {
            Id         = f.Id,
            Nome       = f.Nome,
            Email      = f.Email,
            Telefone   = f.Telefone,
            PlanoAtivo = f.PlanoAtivo
        }
    };
}
