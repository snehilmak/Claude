using System.ComponentModel.DataAnnotations;

namespace MtpApp.Models;

/// <summary>
/// A money transfer network the agency works with (e.g. Intermex, Ria, Vigo).
/// Seeded at startup — not created by end users.
/// </summary>
public class TransferCompany
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    /// <summary>Short uppercase code used internally (e.g. "INTERMEX", "RIA").</summary>
    [Required, MaxLength(30)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? LogoUrl { get; set; }

    /// <summary>When false, the company is hidden from new transaction forms.</summary>
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Transaction> Transactions { get; set; } = [];
    public ICollection<CompanyConfig> Configs { get; set; } = [];
}
