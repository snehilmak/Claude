using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MtpApp.Models;

/// <summary>
/// A single money transfer processed at the counter.
/// Tracks amounts, parties, compliance info, and lifecycle status.
/// </summary>
public class Transaction
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>The transfer company's own confirmation number.</summary>
    [MaxLength(100)]
    public string? ReferenceNumber { get; set; }

    /// <summary>Folio / PIN the recipient uses to collect funds.</summary>
    [MaxLength(100)]
    public string? ControlNumber { get; set; }

    // ── Parties ──────────────────────────────────────────────────────────────

    [Required]
    public string CustomerId { get; set; } = string.Empty;

    /// <summary>Sender's phone — denormalized so it survives customer record changes.</summary>
    [MaxLength(30)]
    public string? SenderPhone { get; set; }

    [Required, MaxLength(200)]
    public string RecipientName { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? RecipientPhone { get; set; }

    [MaxLength(300)]
    public string? RecipientAddress { get; set; }

    [MaxLength(100)]
    public string? RecipientCity { get; set; }

    [Required, MaxLength(100)]
    public string RecipientCountry { get; set; } = string.Empty;

    // ── Amounts ───────────────────────────────────────────────────────────────

    /// <summary>Amount sent by the customer in USD.</summary>
    [Column(TypeName = "decimal(12,2)")]
    public decimal SendAmount { get; set; }

    [MaxLength(3)]
    public string SendCurrency { get; set; } = "USD";

    /// <summary>Amount the recipient will collect in the destination currency.</summary>
    [Column(TypeName = "decimal(12,2)")]
    public decimal? ReceiveAmount { get; set; }

    [MaxLength(3)]
    public string? ReceiveCurrency { get; set; }

    [Column(TypeName = "decimal(10,6)")]
    public decimal? ExchangeRate { get; set; }

    /// <summary>Agency fee charged on top of the send amount.</summary>
    [Column(TypeName = "decimal(10,2)")]
    public decimal Fee { get; set; } = 0;

    /// <summary>Total cash/debit collected from the customer (SendAmount + Fee).</summary>
    [Column(TypeName = "decimal(12,2)")]
    public decimal TotalCollected { get; set; }

    // ── Company & Payment ─────────────────────────────────────────────────────

    [Required]
    public string CompanyId { get; set; } = string.Empty;

    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Cash;

    // ── Status ────────────────────────────────────────────────────────────────

    public TransactionStatus Status { get; set; } = TransactionStatus.Pending;

    [MaxLength(500)]
    public string? CancelReason { get; set; }

    public DateTime? CancelledAt { get; set; }

    // ── Refund Tracking ───────────────────────────────────────────────────────

    public DateTime? RefundDate { get; set; }
    public bool RefundVerified { get; set; } = false;

    // ── Compliance ────────────────────────────────────────────────────────────

    [MaxLength(200)]
    public string? PurposeOfTransfer { get; set; }

    [MaxLength(200)]
    public string? SourceOfFunds { get; set; }

    /// <summary>True when a Currency Transaction Report (CTR) has been filed with FinCEN.</summary>
    public bool IsCtrReported { get; set; } = false;

    /// <summary>True when a Suspicious Activity Report (SAR) has been filed.</summary>
    public bool IsSarFiled { get; set; } = false;

    [MaxLength(1000)]
    public string? Notes { get; set; }

    // ── Relations ─────────────────────────────────────────────────────────────

    [Required]
    public string OrganizationId { get; set; } = string.Empty;

    [Required]
    public string LocationId { get; set; } = string.Empty;

    /// <summary>The agent (User) who entered this transaction at the counter.</summary>
    [Required]
    public string AgentId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey(nameof(CustomerId))]
    public Customer Customer { get; set; } = null!;

    [ForeignKey(nameof(CompanyId))]
    public TransferCompany Company { get; set; } = null!;

    [ForeignKey(nameof(OrganizationId))]
    public Organization Organization { get; set; } = null!;

    [ForeignKey(nameof(LocationId))]
    public Location Location { get; set; } = null!;

    [ForeignKey(nameof(AgentId))]
    public User Agent { get; set; } = null!;
}
