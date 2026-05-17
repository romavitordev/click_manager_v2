using ClickManagerApi.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ClickManagerApi.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    // ── DbSets ────────────────────────────────────────────────
    public DbSet<Fotografo>       Fotografos       { get; set; }
    public DbSet<Cliente>         Clientes         { get; set; }
    public DbSet<Disponibilidade> Disponibilidades { get; set; }
    public DbSet<Ensaio>          Ensaios          { get; set; }
    public DbSet<Contrato>        Contratos        { get; set; }
    public DbSet<Pagamento>       Pagamentos       { get; set; }
    public DbSet<ImagemGaleria>   ImagensGaleria   { get; set; }
    public DbSet<ImagemPortfolio> ImagensPortfolio { get; set; }
    public DbSet<Lead>            Leads            { get; set; }

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // ── Fotografo ────────────────────────────────────────
        mb.Entity<Fotografo>(e =>
        {
            e.HasIndex(f => f.Email).IsUnique();
        });

        // ── Disponibilidade ──────────────────────────────────
        mb.Entity<Disponibilidade>(e =>
        {
            e.HasOne(d => d.Fotografo)
             .WithMany(f => f.Disponibilidades)
             .HasForeignKey(d => d.FotografoId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Cliente ──────────────────────────────────────────
        mb.Entity<Cliente>(e =>
        {
            e.HasOne(c => c.Fotografo)
             .WithMany(f => f.Clientes)
             .HasForeignKey(c => c.FotografoId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Ensaio ───────────────────────────────────────────
        mb.Entity<Ensaio>(e =>
        {
            e.HasOne(en => en.Fotografo)
             .WithMany(f => f.Ensaios)
             .HasForeignKey(en => en.FotografoId)
             .OnDelete(DeleteBehavior.NoAction);   // evita múltiplos cascade paths

            e.HasOne(en => en.Cliente)
             .WithMany(c => c.Ensaios)
             .HasForeignKey(en => en.ClienteId)
             .OnDelete(DeleteBehavior.NoAction);

            e.HasIndex(en => en.DataHora);
            e.HasIndex(en => en.FotografoId);
        });

        // ── Contrato ─────────────────────────────────────────
        mb.Entity<Contrato>(e =>
        {
            e.HasOne(ct => ct.Ensaio)
             .WithOne(en => en.Contrato)
             .HasForeignKey<Contrato>(ct => ct.EnsaioId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(ct => ct.Numero).IsUnique();
        });

        // ── Pagamento ────────────────────────────────────────
        mb.Entity<Pagamento>(e =>
        {
            e.HasOne(p => p.Ensaio)
             .WithMany(en => en.Pagamentos)
             .HasForeignKey(p => p.EnsaioId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── ImagemGaleria ────────────────────────────────────
        mb.Entity<ImagemGaleria>(e =>
        {
            e.HasOne(ig => ig.Ensaio)
             .WithMany(en => en.ImagensGaleria)
             .HasForeignKey(ig => ig.EnsaioId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── ImagemPortfolio ──────────────────────────────────
        mb.Entity<ImagemPortfolio>(e =>
        {
            e.HasOne(ip => ip.Fotografo)
             .WithMany(f => f.Portfolio)
             .HasForeignKey(ip => ip.FotografoId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Seed: fotógrafo de demonstração ──────────────────
        mb.Entity<Fotografo>().HasData(new Fotografo
        {
            Id           = 1,
            Nome         = "Matheus",
            Email        = "matheus@studio.com",
            SenhaHash    = "$2a$11$demo_hash_substituir_por_bcrypt",
            PlanoAtivo   = "pro",
            CriadoEm    = new DateTime(2026, 1, 1),
            AtualizadoEm = new DateTime(2026, 1, 1),
        });

        mb.Entity<Cliente>().HasData(
            new Cliente { Id=1, FotografoId=1, Nome="MARCELA", Email="marcela@cliente.local", TipoEnsaio="Casamento", Status="Pausado", CriadoEm=new DateTime(2026,1,10) },
            new Cliente { Id=2, FotografoId=1, Nome="Virtor",  Email="virtor@cliente.local",  TipoEnsaio="Casamento", Status="Ativo",   CriadoEm=new DateTime(2026,1,12) }
        );

        mb.Entity<Ensaio>().HasData(
            new Ensaio { Id=1, FotografoId=1, ClienteId=1, Titulo="Festa 15 Anos Marcela", DataHora=new DateTime(2026,3,25,15,0,0), Local="Sorocaba", Valor=700, Status="Agendado", CriadoEm=new DateTime(2026,1,10), AtualizadoEm=new DateTime(2026,1,10) },
            new Ensaio { Id=2, FotografoId=1, ClienteId=2, Titulo="casamento",             DataHora=new DateTime(2026,3,24,15,0,0), Local="Igreja",   Valor=200, Status="Agendado", CriadoEm=new DateTime(2026,1,12), AtualizadoEm=new DateTime(2026,1,12) }
        );

        mb.Entity<Contrato>().HasData(
            new Contrato { Id=1, EnsaioId=1, Numero="CTR16778",    Status="Assinado", CriadoEm=new DateTime(2026,1,10) },
            new Contrato { Id=2, EnsaioId=2, Numero="CTR13245673", Status="Assinado", CriadoEm=new DateTime(2026,1,12) }
        );

        mb.Entity<Pagamento>().HasData(
            new Pagamento { Id=1, EnsaioId=1, Valor=700, Tipo="Total", Metodo="Pix", Status="Pago", DataPagamento=new DateTime(2026,1,15), CriadoEm=new DateTime(2026,1,10) },
            new Pagamento { Id=2, EnsaioId=2, Valor=200, Tipo="Total", Metodo="Pix", Status="Pago", DataPagamento=new DateTime(2026,1,16), CriadoEm=new DateTime(2026,1,12) }
        );
    }
}
