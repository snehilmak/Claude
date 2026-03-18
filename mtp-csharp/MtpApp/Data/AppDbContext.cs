using Microsoft.EntityFrameworkCore;
using MtpApp.Models;

namespace MtpApp.Data;

/// <summary>
/// EF Core database context. All tables are mapped here.
/// Uses SQLite locally (mtp.db file in the project root).
/// Run "dotnet ef migrations add Initial" and "dotnet ef database update"
/// to create the schema for the first time.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // ── DbSets (one per table) ────────────────────────────────────────────────

    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<TransferCompany> TransferCompanies => Set<TransferCompany>();
    public DbSet<CompanyConfig> CompanyConfigs => Set<CompanyConfig>();
    public DbSet<Transaction> Transactions => Set<Transaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Unique indexes ────────────────────────────────────────────────────

        modelBuilder.Entity<Organization>()
            .HasIndex(o => o.Slug).IsUnique();

        modelBuilder.Entity<Organization>()
            .HasIndex(o => o.Email).IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email).IsUnique();

        modelBuilder.Entity<Session>()
            .HasIndex(s => s.Token).IsUnique();

        modelBuilder.Entity<TransferCompany>()
            .HasIndex(c => c.Code).IsUnique();

        // Prevent duplicate company config per org
        modelBuilder.Entity<CompanyConfig>()
            .HasIndex(cc => new { cc.OrganizationId, cc.CompanyId }).IsUnique();

        // ── Query indexes for common lookups ──────────────────────────────────

        modelBuilder.Entity<Transaction>()
            .HasIndex(t => new { t.OrganizationId, t.CreatedAt });

        modelBuilder.Entity<Transaction>()
            .HasIndex(t => t.CustomerId);

        modelBuilder.Entity<Transaction>()
            .HasIndex(t => t.Status);

        // ── Seed transfer companies ───────────────────────────────────────────
        // These are seeded so agents can immediately create transactions after
        // registering. The org enables the ones they use in Settings.

        modelBuilder.Entity<TransferCompany>().HasData(
            new TransferCompany { Id = "company-intermex",    Name = "Intermex",       Code = "INTERMEX",    IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new TransferCompany { Id = "company-ria",         Name = "Ria",            Code = "RIA",         IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new TransferCompany { Id = "company-vigo",        Name = "Vigo",           Code = "VIGO",        IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new TransferCompany { Id = "company-barri",       Name = "Barri",          Code = "BARRI",       IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new TransferCompany { Id = "company-maxi",        Name = "Maxi",           Code = "MAXI",        IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new TransferCompany { Id = "company-moneygram",   Name = "MoneyGram",      Code = "MONEYGRAM",   IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new TransferCompany { Id = "company-viamericas",  Name = "ViaAmericas",    Code = "VIAMERICAS",  IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new TransferCompany { Id = "company-westernunion", Name = "Western Union", Code = "WESTERNUNION", IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new TransferCompany { Id = "company-sigue",       Name = "Sigue",          Code = "SIGUE",       IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new TransferCompany { Id = "company-dolex",       Name = "Dolex",          Code = "DOLEX",       IsActive = true, CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        );
    }
}
