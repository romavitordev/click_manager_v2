namespace ClickManagerApi.Models;

public record LoginRequest(string Email, string Senha);

public record RegisterRequest(
    string Nome,
    string Email,
    string Senha,
    string? Telefone = null,
    string PlanoAtivo = "starter"
);

public class AuthResponse
{
    public required string Token      { get; init; }
    public DateTime        ExpiresAt  { get; init; }
    public required FotografoDto Fotografo { get; init; }
}

public class FotografoDto
{
    public int     Id         { get; init; }
    public required string Nome       { get; init; }
    public required string Email      { get; init; }
    public string? Telefone   { get; init; }
    public string? Instagram  { get; init; }
    public string? Bio        { get; init; }
    public required string PlanoAtivo { get; init; }
}

public record UpdateProfileRequest(
    string Nome,
    string? Telefone = null,
    string? Instagram = null,
    string? Bio = null
);
