using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MtpApp.Models;

/// <summary>
/// Per-organization credentials and settings for a specific transfer company.
/// Each agency has their own agent codes, account numbers, and API keys.
/// </summary>
public class CompanyConfig
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string OrganizationId { get; set; } = string.Empty;

    [Required]
    public string CompanyId { get; set; } = string.Empty;

    /// <summary>The agency's agent/operator code assigned by the transfer company.</summary>
    [MaxLength(100)]
    public string? AgentCode { get; set; }

    [MaxLength(100)]
    public string? AccountNumber { get; set; }

    /// <summary>API key for programmatic integration (if supported by the company).</summary>
    [MaxLength(500)]
    public string? ApiKey { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    /// <summary>When false, this company is hidden for this org even if globally active.</summary>
    public bool IsEnabled { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(OrganizationId))]
    public Organization Organization { get; set; } = null!;

    [ForeignKey(nameof(CompanyId))]
    public TransferCompany Company { get; set; } = null!;
}
