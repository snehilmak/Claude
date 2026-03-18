using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MtpApp.Models;

/// <summary>
/// A money transfer sender (customer) registered with the agency.
/// Includes identity verification and compliance flag fields required
/// by BSA/AML regulations.
/// </summary>
public class Customer
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? MiddleName { get; set; }

    public DateTime? DateOfBirth { get; set; }

    [EmailAddress, MaxLength(200)]
    public string? Email { get; set; }

    [Required, MaxLength(30)]
    public string Phone { get; set; } = string.Empty;

    [MaxLength(300)]
    public string? Address { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }

    [MaxLength(50)]
    public string? State { get; set; }

    [MaxLength(20)]
    public string? Zip { get; set; }

    [MaxLength(2)]
    public string Country { get; set; } = "US";

    // ── ID Verification ──────────────────────────────────────────────────────

    public IdType? IdType { get; set; }

    [MaxLength(100)]
    public string? IdNumber { get; set; }

    /// <summary>State or country that issued the ID document.</summary>
    [MaxLength(100)]
    public string? IdIssuedBy { get; set; }

    public DateTime? IdExpiresAt { get; set; }

    // ── Compliance Flags ─────────────────────────────────────────────────────

    /// <summary>
    /// When true, this customer cannot be used for new transactions.
    /// Set by a Manager or Owner after a compliance review.
    /// </summary>
    public bool IsBlocked { get; set; } = false;

    [MaxLength(500)]
    public string? BlockedReason { get; set; }

    /// <summary>
    /// Currency Transaction Report flag. Automatically set when the customer's
    /// aggregate same-day transfers exceed $1,000 (BSA requirement).
    /// </summary>
    public bool CtrFlag { get; set; } = false;

    // Foreign key
    [Required]
    public string OrganizationId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(OrganizationId))]
    public Organization Organization { get; set; } = null!;

    public ICollection<Transaction> Transactions { get; set; } = [];

    /// <summary>Full name computed from first + last name for display purposes.</summary>
    [NotMapped]
    public string FullName => $"{FirstName} {LastName}";
}
