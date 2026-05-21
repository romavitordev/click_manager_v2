using ClickManagerApi.Data;
using ClickManagerApi.Models;
using ClickManagerApi.Models.Entities;
using ClickManagerApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

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

    private int FotografoId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private FotografoDto BuildDto(Fotografo f) => new()
    {
        Id         = f.Id,
        Nome       = f.Nome,
        Email      = f.Email,
        Telefone   = f.Telefone,
        Instagram  = f.Instagram,
        Bio        = f.Bio,
        PlanoAtivo = f.PlanoAtivo
    };

    private AuthResponse BuildResponse(Fotografo f) => new()
    {
        Token     = _auth.GenerateToken(f),
        ExpiresAt = DateTime.UtcNow.AddHours(24),
        Fotografo = BuildDto(f)
    };

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var fotografo = await _db.Fotografos.FindAsync(FotografoId);
        if (fotografo is null) return NotFound();
        return Ok(BuildDto(fotografo));
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest req)
    {
        var fotografo = await _db.Fotografos.FindAsync(FotografoId);
        if (fotografo is null) return NotFound();

        fotografo.Nome      = string.IsNullOrWhiteSpace(req.Nome) ? fotografo.Nome : req.Nome.Trim();
        fotografo.Telefone  = string.IsNullOrWhiteSpace(req.Telefone) ? null : req.Telefone.Trim();
        fotografo.Instagram = string.IsNullOrWhiteSpace(req.Instagram) ? null : req.Instagram.Trim();
        fotografo.Bio       = string.IsNullOrWhiteSpace(req.Bio) ? null : req.Bio.Trim();
        fotografo.AtualizadoEm = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(BuildDto(fotografo));
    }
}
